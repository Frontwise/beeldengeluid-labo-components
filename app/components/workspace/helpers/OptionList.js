
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

    return valueSort(options);
}


// Create a {value/name} classification list based on given bookmarks
export const createClassificationOptionList = (items, key) =>{
    if (!items){ return []; }
    items = items.reduce((acc, i)=>(acc.concat(i[key])), []);
    const hits = {};
    const options = [];
    items.forEach(item => {
        const t = item.annotationId;
        if (t && !(t in hits)) {
            options.push({ value: t, name: item.label });
            hits[t] = true;
        }
    });

    return valueSort(options);
}

// Create a {value/name} array list based on given bookmarks
export const createSimpleArrayOptionList = (items, getValue) => {
    items = items.reduce((acc, i)=>(acc.concat(getValue(i))), []);
    const hits = {};
    const options = [];
    items.forEach(t => {
        if (t && !(t in hits)) {
            options.push({ value: t, name: t });
            hits[t] = true;
        }
    });

    return valueSort(options);
}

const valueSort = (list) =>{
    return list.sort((a,b) => {a.value > b.value});
}

// Create a {value/name} classification list based on given annotations
export const createAnnotationClassificationOptionList = (items, key) =>{
    let hits = {};
    return items.reduce((a,b)=>(
        a.concat(createClassificationOptionList(b.bookmarks,key))
        ),[]).filter((o)=>{
            if (!(o.value in hits)){
                hits[o.value] = true;
                return true;
            }
            return false;
        });
}