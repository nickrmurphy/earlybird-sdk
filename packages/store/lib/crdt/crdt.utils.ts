// DJB2 hash function - synchronous and fast
export const computeHash = (data: string): string => {
  let hash = 5381;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash + data.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(16);
};
