export const toU64Le = (n: number) => {
  const a = [];
  a.unshift(n & 255);

  while (n >= 256) {
    n = n >>> 8;
    a.unshift(n & 255);
  }

  for (let i = a.length; i < 8; i++) {
    a.push(0);
  }

  return new Uint8Array(a);
};
