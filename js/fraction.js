export const Fraction = {
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

export const ZERO = [0, 1];
export const ONE = [1, 1];