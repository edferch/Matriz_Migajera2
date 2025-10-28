import { Fraction } from './fraction.js';
import { solveWithCramer, invertMatrix, formatMatrixForDisplay, solveWithGaussJordan, invertMatrixWithGaussJordan } from './matrix.js';

/**
 * Formatea una matriz para mostrarla, con opciones para resaltar filas.
 * @param {Array<Array<[number, number]>>} matrix La matriz a formatear.
 * @param {object} [highlights={}] Opciones de resaltado.
 * @param {number} highlights.pivot Índice de la fila pivote.
 * @param {number} highlights.modified Índice de la fila modificada.
 * @param {Array<number>} highlights.swap Índices de las filas intercambiadas.
 * @returns {string} El HTML de la matriz formateada.
 */
const formatMatrixWithHighlight = (matrix, highlights = {}) => {
    return matrix.map((row, rowIndex) => {
        const isPivot = highlights.pivot === rowIndex;
        const isModified = highlights.modified === rowIndex;
        const isSwap = highlights.swap?.includes(rowIndex);
        const rowClass = isPivot ? 'row-pivot' : isModified ? 'row-modified' : isSwap ? 'row-swap' : '';
        return `<span class="${rowClass}">| ${row.map(val => Fraction.toString(val).padStart(8)).join(' ')} |</span>`;
    }).join('\n');
};

document.addEventListener('DOMContentLoaded', () => {
    // Elementos de la nueva interfaz
    const methodSelection = document.getElementById('method-selection');
    if (!methodSelection) return; // Salir si no estamos en la página de la calculadora

    const calculatorInterface = document.getElementById('calculator-interface');
    const cramerBtn = document.getElementById('cramer-btn');
    const adjInverseBtn = document.getElementById('adj-inverse-btn');
    const gaussJordanBtn = document.getElementById('gauss-jordan-btn');
    const gaussInverseBtn = document.getElementById('gauss-inverse-btn');
    const backToSelectionBtn = document.getElementById('back-to-selection-btn');
    const backToHomeBtn = document.getElementById('back-to-home-btn');
    const clearButton = document.getElementById('clear-button');
    const calculateButton = document.getElementById('calculate-button');

    // Elementos de la calculadora
    const sizeSelector = document.getElementById('matrix-size');
    const matrixContainer = document.getElementById('matrix-container');
    const stepsContainer = document.getElementById('steps-container');

    let currentMethod = null;

    const variableNames = ['x', 'y', 'z', 'w', 'v'];

    // Modificado para mostrar/ocultar la columna de resultados 'b'
    const createMatrixInputs = (showVectorB = true) => {
        const size = parseInt(sizeSelector.value, 10);
        matrixContainer.innerHTML = ''; 
        const grid = document.createElement('div');
        grid.id = 'matrix-inputs';
        grid.style.gridTemplateColumns = showVectorB ? `repeat(${size}, 1fr) auto 1fr` : `repeat(${size}, 1fr)`;

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

            if (showVectorB) {
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
            }
            
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

            if (currentMethod === 'cramer' || currentMethod === 'gauss-jordan') { // Inversa no usa vectorB
                const resultInput = document.querySelector(`input[data-row='${i}'][data-col='${size}']`);
                vectorB.push(Fraction.fromNumber(parseFloat(resultInput.value) || 0));
            }
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
        stepsContainer.innerHTML = ''; // Limpiar resultados anteriores
        steps.forEach(step => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'step';

            let content = `<h3>${step.title}</h3>`;
            
            if (step.matrix && !step.cofactorDetails) { // Evitar duplicar la matriz de cofactores
                content += `<div class="matrix-display">${formatMatrixWithHighlight(step.matrix)}</div>`;
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
                content += `<h4>Matriz de Cofactores Resultante:</h4><div class="matrix-display">${formatMatrixWithHighlight(step.matrix)}</div>`;
            }
            if (step.type === 'inverse_multiplication') {
                content += `<p class="calculation">Ahora, multiplicamos la matriz adjunta por el escalar 1/det(A):</p>`;
                content += `<div class="final-calculation-grid">
                                <div class="matrix-display">${Fraction.toString(step.scalar)}</div>
                                <span>*</span>
                                <div class="matrix-display">${formatMatrixForDisplay(step.adjugateMatrix)}</div>
                                <span class="equals-sign">=</span>
                                <div></div>
                                <div class="matrix-display">${formatMatrixWithHighlight(step.finalMatrix)}</div>
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
            
            if (step.type === 'row_operation') {
                content = `<h3>${step.operation}</h3>`; // La descripción de la operación
                if (step.matrixBefore) {
                    content += `<p>Matriz antes de la operación:</p>`;
                    content += `<div class="matrix-display">${formatMatrixWithHighlight(step.matrixBefore, step.highlight)}</div>`;
                }
                content += `<p>Matriz después de la operación:</p>`; // La matriz resultante
                content += `<div class="matrix-display">${formatMatrixWithHighlight(step.matrix, step.highlight)}</div>`;

                if (step.detailedCalculations) {
                    content += `<div class="detailed-calculations"><h4>Cálculos detallados:</h4><ul>`;
                    step.detailedCalculations.forEach(calc => {
                        content += `<li>${calc}</li>`;
                    });
                    content += `</ul></div>`;
                }
            }

            stepDiv.innerHTML = content;
            stepsContainer.appendChild(stepDiv);
        });
    };
    
    /**
     * @param {string} message
     */
    const displayError = (message) => {
        stepsContainer.innerHTML = `<div class="step" style="border-color: #e74c3c;"><h3 style="color: #e74c3c;">Error</h3><p>${message}</p></div>`;
    };

    const clearMatrix = () => {
        const inputs = matrixContainer.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });
        stepsContainer.innerHTML = ''; // También limpia los resultados
    };

    const resetToSelection = () => {
        calculatorInterface.classList.add('hidden');
        methodSelection.classList.remove('hidden');
    };

    const setupCalculator = (method, showVectorB) => {
        currentMethod = method;
        methodSelection.classList.add('hidden');
        calculatorInterface.classList.remove('hidden');
        stepsContainer.innerHTML = '';
        createMatrixInputs(showVectorB);
    };

    cramerBtn.addEventListener('click', () => {
        setupCalculator('cramer', true);
    });

    adjInverseBtn.addEventListener('click', () => {
        setupCalculator('adj-inverse', false);
    });

    gaussJordanBtn.addEventListener('click', () => {
        setupCalculator('gauss-jordan', true);
    });

    gaussInverseBtn.addEventListener('click', () => {
        setupCalculator('gauss-inverse', false);
    });

    backToSelectionBtn.addEventListener('click', resetToSelection);

    backToHomeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });

    clearButton.addEventListener('click', clearMatrix);

    sizeSelector.addEventListener('change', () => {
        const showVectorB = currentMethod === 'cramer' || currentMethod === 'gauss-jordan';
        createMatrixInputs(showVectorB);
    });
    
    calculateButton.addEventListener('click', () => {
        if (currentMethod === 'cramer') {
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
        } else if (currentMethod === 'adj-inverse') {
            const { matrixA } = getMatrixFromDOM();
            const result = invertMatrix(matrixA);

            displaySteps(result.steps);

            if (result.error) {
                displayError(result.error);
            } else {
                const finalSolutionDiv = document.createElement('div');
                finalSolutionDiv.className = 'step';
                finalSolutionDiv.innerHTML = `<h3>Resultado Final: Matriz Inversa A⁻¹</h3><div class="matrix-display">${formatMatrixWithHighlight(result.inverse)}</div>`;
                stepsContainer.appendChild(finalSolutionDiv);
            }
        } else if (currentMethod === 'gauss-jordan') {
            const { matrixA, vectorB } = getMatrixFromDOM();
            const result = solveWithGaussJordan(matrixA, vectorB);

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
        } else if (currentMethod === 'gauss-inverse') {
            const { matrixA } = getMatrixFromDOM();
            const result = invertMatrixWithGaussJordan(matrixA);

            displaySteps(result.steps);

            if (result.error) {
                displayError(result.error);
            } else {
                const finalSolutionDiv = document.createElement('div');
                finalSolutionDiv.className = 'step';
                finalSolutionDiv.innerHTML = `<h3>Resultado Final: Matriz Inversa A⁻¹</h3><div class="matrix-display">${formatMatrixWithHighlight(result.inverse)}</div>`;
                stepsContainer.appendChild(finalSolutionDiv);
            }
        }
    });
});
