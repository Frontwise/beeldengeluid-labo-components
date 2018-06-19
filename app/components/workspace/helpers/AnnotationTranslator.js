export const AnnotationTranslator = (type) =>{
  switch(type){
    case 'classification': return 'code';
    case 'metadata': return 'metadata card';
    default:
      return type;
  }
}