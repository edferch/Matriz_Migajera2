import { Fraction, ZERO, ONE } from './fraction.js';

/**
 * @param {Array<Array<[number, number]>>} matrix
 * @returns {string}
 */
export const formatMatrixForDisplay = (matrix) =>
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
export const determinant = (matrix) => {
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
export const solveWithCramer = (matrixA, vectorB) => {
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
export const invertMatrix = (matrixA) => {
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