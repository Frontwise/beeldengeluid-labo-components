
// Create a {value/name} list based on given items and key
export const createOptionList = (items, getValue) =>{
  const hits = {};
  const options = [];
  items.forEach(item => {
      const t = getValue(item);
      if (t && !(t in hits)) {
          options.push({ value: t, name: t.charAt(0).toUpperCase() + t.slice(1) });
          hits[t] = true;
      }
  });

  return options;
}