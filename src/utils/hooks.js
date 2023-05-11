import * as htmlToImage from 'html-to-image';
// Desc: custom hooks for the app
const createFileName = (extension = '', ...names) => {
  if (!extension) {
    return '';
  }

  return `${names.join('')}.${extension}`;
};

// custom hook for taking screenshot of the node and downloading it
export const useScreenShot = (node) => {
  const takeScreenShot = async (node) => {
    const dataURI = await htmlToImage.toJpeg(node);
    return dataURI;
  };

  const download = (image, { name = 'img', extension = 'jpg' } = {}) => {
    const a = document.createElement('a');
    a.href = image;
    a.download = createFileName(extension, name);
    a.click();
  };

  return { takeScreenShot, download };
};
