export const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
export const VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]; // 8 and 9 are excluded

export const getCardValue = (valor) => {
    if (valor === 10) return 8;
    if (valor === 11) return 9;
    if (valor === 12) return 10;
    return valor;
};
