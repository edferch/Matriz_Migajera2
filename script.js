const Fraction = {
    gcd: (a, b) => {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            [a, b] = [b, a % b];
        }
        return a;
    },
    simplify: ([num, den]) => {
        const common = Fraction.gcd(num, den);
        den = den / common;
        num = num / common;
        if (den < 0) {
            den = -den;
            num = -num;
        }
        return [num, den];
    },
    fromNumber: (num) => {
        if (Number.isInteger(num)) return [num, 1];
        let den = 1;
        while (num * den % 1 !== 0) {
            den *= 10;
        }
        return Fraction.simplify([num * den, den]);
    },
    add: ([n1, d1], [n2, d2]) => Fraction.simplify([n1 * d2 + n2 * d1, d1 * d2]),
    subtract: ([n1, d1], [n2, d2]) => Fraction.simplify([n1 * d2 - n2 * d1, d1 * d2]),
    multiply: ([n1, d1], [n2, d2]) => Fraction.simplify([n1 * n2, d1 * d2]),
    divide: ([n1, d1], [n2, d2]) => Fraction.simplify([n1 * d2, d1 * n2]),
    toString: ([num, den]) => (den === 1 ? `${num}` : `${num}/${den}`),
    toNumber: ([num, den]) => num / den,
};

const ZERO = [0, 1];
const ONE = [1, 1];

/**
 * @param {Array<Array<[number, number]>>} matrix
 * @returns {string}
 */

const formatMatrixForDisplay = (matrix) =>
    matrix.map(row => `| ${row.map(val => Fraction.toString(val).padStart(8)).join(' ')} |`).join('\n');

/**
 * @param {number[][]} matrix 
 * @param {number} rowToRemove 
 * @param {number} colToRemove 
 * @returns {number[][]} 
 */
const getMinor = (matrix, rowToRemove, colToRemove) =>
    matrix
        .filter((_, rowIndex) => rowIndex !== rowToRemove)
        .map(row => row.filter((_, colIndex) => colIndex !== colToRemove));

/**
 * @param {Array<Array<[number, number]>>} matrix 
 * @returns {{value: [number, number], calculationTree: object}} 
 */
const determinant = (matrix) => {
    if (matrix.length === 1) {
        return { value: matrix[0][0], calculationTree: { type: 'base', result: matrix[0][0] } };
    }
    if (matrix.length === 2) {
        const [a, b] = matrix[0];
        const [c, d] = matrix[1];
        const result = Fraction.subtract(Fraction.multiply(a, d), Fraction.multiply(b, c));
        return {
            value: result,
            calculationTree: {
                type: '2x2',
                a, b, c, d,
                result
            }
        };
    }
    if (matrix.length === 3) {
        const [
            [a, b, c],
            [d, e, f],
            [g, h, i]
        ] = matrix;

        const p1 = Fraction.multiply(Fraction.multiply(a, e), i);
        const p2 = Fraction.multiply(Fraction.multiply(b, f), g);
        const p3 = Fraction.multiply(Fraction.multiply(c, d), h);
        const positiveSum = Fraction.add(Fraction.add(p1, p2), p3);

        const n1 = Fraction.multiply(Fraction.multiply(c, e), g);
        const n2 = Fraction.multiply(Fraction.multiply(a, f), h);
        const n3 = Fraction.multiply(Fraction.multiply(b, d), i);
        const negativeSum = Fraction.add(Fraction.add(n1, n2), n3);

        const result = Fraction.subtract(positiveSum, negativeSum);

        return {
            value: result,
            calculationTree: {
                type: 'sarrus',
                positiveTerms: [
                    { values: [a, e, i], product: p1 },
                    { values: [b, f, g], product: p2 },
                    { values: [c, d, h], product: p3 }
                ],
                negativeTerms: [
                    { values: [c, e, g], product: n1 },
                    { values: [a, f, h], product: n2 },
                    { values: [b, d, i], product: n3 }
                ],
                positiveSum, negativeSum, result
            }
        };
    }
    let total = ZERO;
    const terms = [];

    matrix[0].forEach((val, colIndex) => {
        if (val[0] === 0) return;

        const sign = colIndex % 2 === 0 ? ONE : [-1, 1];
        const minor = getMinor(matrix, 0, colIndex);
        const detMinorResult = determinant(minor);
        const termValue = Fraction.multiply(sign, Fraction.multiply(val, detMinorResult.value));
        total = Fraction.add(total, termValue);

        terms.push({
            sign: sign[0] > 0 ? '+' : '-',
            value: val,
            minor: minor,
            minorDet: detMinorResult
        });
    });

    return { value: total, calculationTree: { type: 'expansion', terms, result: total } };
};

/**
 * @param {number[][]} matrixA 
 * @param {number[]} vectorB 
 * @returns {object} 
 */
const solveWithCramer = (matrixA, vectorB) => {
    const variableNames = ['x', 'y', 'z', 'w', 'v'];
    const steps = [];
    const { value: detA, calculationTree: detACalcTree } = determinant(matrixA);

    steps.push({
        title: "Paso 1: Calcular el determinante del sistema (Δ)",
        matrix: matrixA,
        calculationTree: detACalcTree,
    });

    if (detA[0] === 0) {
        return {
            solution: null,
            error: "El determinante es 0. El sistema no tiene una solución única.",
            steps
        };
    }

    const variables = vectorB.map((_, i) => {
        const matrixAi = matrixA.map(row => [...row]);
        
        for (let j = 0; j < matrixAi.length; j++) {
            matrixAi[j][i] = vectorB[j];
        }

        const { value: detAi, calculationTree: detAiCalcTree } = determinant(matrixAi);
        const value = Fraction.divide(detAi, detA);
        const varName = variableNames[i] || `x${i + 1}`;
        
        steps.push({
            title: `Paso ${i + 2}: Calcular el determinante para la variable ${varName} (Δ${varName})`,
            matrix: matrixAi,
            calculationTree: detAiCalcTree,
        });
        
        steps.push({
            type: 'cramer_division',
            title: `Paso ${i + 2}.1: Encontrar el valor de ${varName}`,
            variableName: varName,
            detNumerator: detAi,
            detDenominator: detA,
            finalValue: value,
            calculation: `${varName} = Δ${varName} / Δ`
        });

        return { name: varName, value: Fraction.toString(value) };
    });

    return { solution: variables, detA, steps };
};

/**
 * @param {number[][]} matrix 
 * @returns {number[][]} 
 */
const cofactorMatrix = (matrix) =>
    matrix.map((row, rowIndex) =>
        row.map((_, colIndex) => {
            const sign = (rowIndex + colIndex) % 2 === 0 ? ONE : [-1, 1];
            const minor = getMinor(matrix, rowIndex, colIndex);
            const { value: detMinorValue } = determinant(minor);
            return Fraction.multiply(sign, detMinorValue);
        })
    );

/**
 * @param {number[][]} matrix 
 * @returns {number[][]} 
 */
const transpose = (matrix) =>
    matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));

/**

 * @param {number[][]} matrix 
 * @param {number} scalar 
 * @returns {number[][]}
 */
const multiplyMatrixByScalar = (matrix, scalar) =>
    matrix.map(row => row.map(val => Fraction.multiply(val, scalar)));

/**
 * @param {number[][]} matrixA
 * @returns {object} 
 */
const invertMatrix = (matrixA) => {
    const steps = [];
    const { value: detA, calculationTree: detACalcTree } = determinant(matrixA);

    steps.push({
        title: "Paso 1: Calcular el determinante de la matriz (det(A))",
        matrix: matrixA,
        calculationTree: detACalcTree,
    });

    if (detA[0] === 0) {
        return {
            inverse: null,
            error: "El determinante es 0. La matriz no tiene inversa.",
            steps
        };
    }

    const cofactorDetails = [];
    const cofactorsMatrix = matrixA.map((row, rowIndex) => 
        row.map((_, colIndex) => {
            const sign = (rowIndex + colIndex) % 2 === 0 ? ONE : [-1, 1];
            const minor = getMinor(matrixA, rowIndex, colIndex);
            const detMinorResult = determinant(minor);
            const cofactorValue = Fraction.multiply(sign, detMinorResult.value);
            
            cofactorDetails.push({
                pos: `C${rowIndex + 1}${colIndex + 1}`,
                sign: (rowIndex + colIndex) % 2 === 0 ? 1 : -1,
                minor,
                detMinorResult,
                cofactorValue
            });
            return cofactorValue;
        })
    );
    steps.push({
        title: "Paso 2: Calcular la Matriz de Cofactores C(A)",
        cofactorDetails: cofactorDetails, 
        matrix: cofactorsMatrix, 
    });

    const adjugate = transpose(cofactorsMatrix);
    steps.push({
        title: "Paso 3: Calcular la Matriz Adjunta adj(A) = C(A)ᵀ",
        matrix: adjugate,
        calculation: "La matriz adjunta es la transpuesta de la matriz de cofactores."
    });

    const detInverse = Fraction.divide(ONE, detA);
    const inverse = multiplyMatrixByScalar(adjugate, detInverse);
    steps.push({
        type: 'inverse_multiplication', 
        title: "Paso 4: Calcular la Matriz Inversa A⁻¹ = (1/det(A)) * adj(A)",
        scalar: detInverse,
        adjugateMatrix: adjugate,
        finalMatrix: inverse
    });

    return { inverse, steps };
};

document.addEventListener('DOMContentLoaded', () => {
    const sizeSelector = document.getElementById('matrix-size');
    const matrixContainer = document.getElementById('matrix-container');
    const solveButton = document.getElementById('solve-button');
    const inverseButton = document.getElementById('inverse-button');
    const stepsContainer = document.getElementById('steps-container');

    const variableNames = ['x', 'y', 'z', 'w', 'v'];
    const createMatrixInputs = () => {
        const size = parseInt(sizeSelector.value, 10);
        matrixContainer.innerHTML = ''; 
        const grid = document.createElement('div');
        grid.id = 'matrix-inputs';
        grid.style.gridTemplateColumns = `repeat(${size}, 1fr) auto 1fr`;

        for (let i = 0; i < size; i++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'matrix-row';
            
            for (let j = 0; j < size; j++) {
                const input = document.createElement('input');
                input.type = 'number';
                input.placeholder = variableNames[j] || `x${j+1}`;
                input.dataset.row = i;
                input.dataset.col = j;
                rowDiv.appendChild(input);
            }

            const equals = document.createElement('span');
            equals.className = 'equals-sign';
            equals.textContent = '=';
            rowDiv.appendChild(equals);

            const resultInput = document.createElement('input');
            resultInput.type = 'number';
            resultInput.placeholder = `b${i + 1}`;
            resultInput.dataset.row = i;
            resultInput.dataset.col = size; 
            rowDiv.appendChild(resultInput);

            grid.appendChild(rowDiv);
        }
        matrixContainer.appendChild(grid);
    };

    /**
     * @returns {{matrixA: number[][], vectorB: number[]}}
     */
    const getMatrixFromDOM = () => {
        const size = parseInt(sizeSelector.value, 10);
        const matrixA = [];
        const vectorB = [];

        for (let i = 0; i < size; i++) {
            const row = [];
            for (let j = 0; j < size; j++) {
                const input = document.querySelector(`input[data-row='${i}'][data-col='${j}']`);
                row.push(Fraction.fromNumber(parseFloat(input.value) || 0));
            }
            matrixA.push(row);

            const resultInput = document.querySelector(`input[data-row='${i}'][data-col='${size}']`);
            vectorB.push(Fraction.fromNumber(parseFloat(resultInput.value) || 0));
        }
        return { matrixA, vectorB };
    };

    /**
     * @param {object} tree 
     * @returns {string} 
     */
    const buildCalculationHtml = (tree) => {
        if (!tree) return '';

        if (tree.type === '2x2') {
            const { a, b, c, d, result } = tree;
            const term1 = Fraction.multiply(a, d);
            const term2 = Fraction.multiply(b, c);
            return `<p class="calculation">(${Fraction.toString(a)} * ${Fraction.toString(d)}) - (${Fraction.toString(b)} * ${Fraction.toString(c)}) = ${Fraction.toString(term1)} - ${Fraction.toString(term2)} = <strong>${Fraction.toString(result)}</strong></p>`;
        }

        if (tree.type === 'sarrus') {
            let html = `<p class="calculation">Aplicando la Regla de Sarrus (suma de diagonales principales menos suma de diagonales secundarias):</p>`;
            html += `<div class="sarrus-calculation">`;
            
            html += `<div class="sarrus-diagonals"><h4>Diagonales Positivas (+)</h4>`;
            tree.positiveTerms.forEach(term => {
                html += `<p>(${term.values.map(Fraction.toString).join(' * ')}) = ${Fraction.toString(term.product)}</p>`;
            });
            html += `<p><strong>Suma = ${Fraction.toString(tree.positiveSum)}</strong></p></div>`;

            html += `<span class="sarrus-separator">-</span>`;

            html += `<div class="sarrus-diagonals"><h4>Diagonales Negativas (-)</h4>`;
            tree.negativeTerms.forEach(term => {
                html += `<p>(${term.values.map(Fraction.toString).join(' * ')}) = ${Fraction.toString(term.product)}</p>`;
            });
            html += `<p><strong>Suma = ${Fraction.toString(tree.negativeSum)}</strong></p></div>`;
            html += `</div>`;
            html += `<p class="calculation"><strong>Resultado:</strong> (${Fraction.toString(tree.positiveSum)}) - (${Fraction.toString(tree.negativeSum)}) = <strong>${Fraction.toString(tree.result)}</strong></p>`;
            return html;
        }

        if (tree.type === 'expansion') {
            let html = '<div class="determinant-expansion">';
            tree.terms.forEach(term => {
                html += `
                    <div class="determinant-term">
                        <span class="term-sign">${term.sign}</span>
                        <span class="term-value">${Fraction.toString(term.value)}</span>
                        <span>*</span>
                        <div class="matrix-display">${formatMatrixForDisplay(term.minor)}</div>
                    </div>
                `;
            });
            html += '</div>';

            tree.terms.forEach(term => {
                if (term.minor.length > 1) {
                     html += `<div class="sub-calculation">
                        <p>Para el término <strong>${Fraction.toString(term.value)}</strong>, el determinante del menor es:</p>
                        ${buildCalculationHtml(term.minorDet.calculationTree)}
                     </div>`;
                }
            });

            html += `<p class="calculation"><strong>Resultado final del determinante: ${Fraction.toString(tree.result)}</strong></p>`;
            return html;
        }

        return `<p class="calculation">Determinante = <strong>${Fraction.toString(tree.result)}</strong></p>`;
    };

    /**
     * @param {Array<object>} steps
     */
    const displaySteps = (steps) => {
        stepsContainer.innerHTML = '';
        steps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step';

            let content = `<h3>${step.title}</h3>`;
            
            if (step.matrix && !step.cofactorDetails) { // Evitar duplicar la matriz de cofactores
                content += `<div class="matrix-display">${formatMatrixForDisplay(step.matrix)}</div>`;
            }

            if (step.cofactorDetails) {
                content += `<p class="calculation">Calculamos cada cofactor Cᵢⱼ = (-1)ⁱ⁺ʲ * det(Mᵢⱼ), donde Mᵢⱼ es la matriz menor.</p>`;
                content += `<div class="cofactor-grid">`;
                step.cofactorDetails.forEach(detail => {
                    content += `
                        <div class="cofactor-calculation">
                            <h5>Cálculo de ${detail.pos}</h5>
                            <p class="cofactor-formula">${detail.pos} = (-1)<sup>${detail.pos.substring(1, 2)}+${detail.pos.substring(2, 3)}</sup> * det(Menor)</p>
                            <div class="matrix-display">${formatMatrixForDisplay(detail.minor)}</div>
                            ${buildCalculationHtml(detail.detMinorResult.calculationTree)}
                            <p class="result">${detail.pos} = (${detail.sign}) * (${Fraction.toString(detail.detMinorResult.value)}) = ${Fraction.toString(detail.cofactorValue)}</p>
                        </div>
                    `;
                });
                content += `</div>`;
                content += `<h4>Matriz de Cofactores Resultante:</h4><div class="matrix-display">${formatMatrixForDisplay(step.matrix)}</div>`;
            }
            if (step.type === 'inverse_multiplication') {
                content += `<p class="calculation">Ahora, multiplicamos la matriz adjunta por el escalar 1/det(A):</p>`;
                content += `<div class="final-calculation-grid">
                                <div class="matrix-display">${Fraction.toString(step.scalar)}</div>
                                <span>*</span>
                                <div class="matrix-display">${formatMatrixForDisplay(step.adjugateMatrix)}</div>
                                <span class="equals-sign">=</span>
                                <div></div>
                                <div class="matrix-display">${formatMatrixForDisplay(step.finalMatrix)}</div>
                            </div>`;
            }
            if (step.type === 'cramer_division') {
                content += `<p class="calculation">${step.calculation}</p>`;
                content += `<div class="cramer-result-grid">
                                <span>${step.variableName} =</span>
                                <div class="fraction-display">
                                    <span class="numerator">${Fraction.toString(step.detNumerator)}</span>
                                    <span class="denominator">${Fraction.toString(step.detDenominator)}</span>
                                </div>
                                <span class="equals-sign">=</span>
                                <span class="result">${Fraction.toString(step.finalValue)}</span>
                            </div>`;
            }

            if (step.calculationTree) {
                content += `<div class="calculation-container">${buildCalculationHtml(step.calculationTree)}</div>`;
            }

            if (step.calculation && !step.type) { 
                content += `<p class="calculation">${step.calculation}</p>`;
            }
            
            stepDiv.innerHTML = content;
            stepsContainer.appendChild(stepDiv);
        });
    };
    
    /**
     * @param {string} message
     */
    const displayError = (message) => {
        stepsContainer.innerHTML = `<div class="step"><h3 style="color: #e74c3c;">Error</h3><p>${message}</p></div>`;
    };

    sizeSelector.addEventListener('change', createMatrixInputs);
    
    solveButton.addEventListener('click', () => {
        const { matrixA, vectorB } = getMatrixFromDOM();
        const result = solveWithCramer(matrixA, vectorB);
        
        displaySteps(result.steps);
        
        if (result.error) {
            displayError(result.error);
        } else {
            const finalSolutionDiv = document.createElement('div');
            finalSolutionDiv.className = 'step';
            let solutionText = result.solution.map(v => `${v.name} = ${v.value}`).join(', ');
            finalSolutionDiv.innerHTML = `<h3>Solución Final</h3><p class="result">${solutionText}</p>`;
            stepsContainer.appendChild(finalSolutionDiv);
        }
    });

    inverseButton.addEventListener('click', () => {
        const { matrixA } = getMatrixFromDOM();
        const result = invertMatrix(matrixA);

        displaySteps(result.steps);

        if (result.error) {
            displayError(result.error);
        } else {
            const finalSolutionDiv = document.createElement('div');
            finalSolutionDiv.className = 'step';
            finalSolutionDiv.innerHTML = `<h3>Resultado Final: Matriz Inversa A⁻¹</h3><div class="matrix-display">${formatMatrixForDisplay(result.inverse)}</div>`;
            stepsContainer.appendChild(finalSolutionDiv);
        }
    });

    createMatrixInputs();
});
