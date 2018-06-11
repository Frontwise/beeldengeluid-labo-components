// Show a H:MM:SS time label based on the time input in seconds
export const secToTime = (t) => {
    const hours = Math.floor(t / 3600);
    t -= hours * 3600;
    const minutes = Math.floor(t / 60);
    t -= minutes * 60;
    const seconds = parseInt(t % 60, 10);  
    return hours + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds)    
}
