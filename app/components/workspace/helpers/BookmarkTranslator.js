export const BookmarkTranslator = (type) =>{
  switch(type){
    case 'Segment': return 'Fragment';
    case 'segment': return 'fragment';
    default:
      return type;
  }
}