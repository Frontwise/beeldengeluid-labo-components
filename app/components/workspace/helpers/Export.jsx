/**
 * Export data
 *
 * @param {object} data Data to export
 */
export const exportDataAsJSON = data => {
  // unique window name
  const windowName = 'name_' + new Date().getTime();

  // open window and write export contents as json
  const exportWindow = window.open('', windowName, 'width=800,height=800');
  exportWindow.document.write(
    '<pre>' + JSON.stringify(data, null, 4) + '</pre>'
  );
};
