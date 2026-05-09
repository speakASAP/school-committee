const MAX_SEQUENCE = 999999;
let sequence = Math.floor(Math.random() * 100000);

export function generateVariableSymbol(): string {
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");

  sequence = (sequence % MAX_SEQUENCE) + 1;
  const seq = String(sequence).padStart(6, "0");

  return `${yy}${mm}${seq}`;
}
