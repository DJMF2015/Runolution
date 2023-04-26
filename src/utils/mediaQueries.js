export const breakpoints = {
  sm: 450,
  md: 770,
  lg: 1366,
};

export const mediaQueries = (key) => {
  return (style) => `@media (max-width: ${breakpoints[key]}px) { ${style}} `;
};
