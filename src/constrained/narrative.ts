export function narrative(s:any):string {
 const f=(n:number)=>Number(n.toFixed(2)).toLocaleString();
 const type=s.task==='vegetation'?'vegetation':s.task==='water'?'water':s.task==='builtup'?'built-up surfaces':'selected intensity regions';
 if(s.task==='statistics')return `The image has ${s.totalPixels.toLocaleString()} valid pixels in the analysis grid. Their average value is ${f(s.statisticsAfter.mean)}, ranging from ${f(s.statisticsAfter.min)} to ${f(s.statisticsAfter.max)}. These statistics alone do not identify land cover.`;
 if(s.task==='change')return `${f(s.coverage)}% of the compared image changed beyond the selected sensitivity, while ${f(100-s.coverage)}% stayed below it. This measures visible differences, which can include land-cover changes, seasonal colour or lighting; it does not by itself identify flooding or construction.`;
 const caveat=s.method.startsWith('RGB')?' This is a colour-based estimate, not a verified land-cover map.':s.task==='builtup'?' This is an index-based estimate, not individual building detection.':s.task==='sar'?' These are radar-intensity regions, not a land-cover classification.':' This is an estimate from the selected spectral-index threshold.';
 if(s.mode==='bitemporal')return `Estimated ${type} coverage is ${f(s.beforeCoverage)}% before and ${f(s.afterCoverage)}% after—a ${s.netPercentagePoints<0?'decrease':'increase'} of ${f(Math.abs(s.netPercentagePoints))} percentage points. ${f(s.lostCoverage)}% of the image lost this signature and ${f(s.gainedCoverage)}% gained it.${caveat}`;
 return `An estimated ${f(s.coverage)}% of the valid image area matches ${type}.${caveat}`;
}
