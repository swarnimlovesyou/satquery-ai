import type { Task } from './engine';
export function routeQuestion(question:string, current:Task, hasResult:boolean):Task|null {
 const q=question.toLowerCase();
 if(/\b(define|meaning|crs|resolution|metadata)\b|what does .* mean|what (is|are) (ndvi|ndwi|ndbi)|band information/.test(q))return null;
 if(/vegetation|forest|crop|ndvi/.test(q))return 'vegetation';
 if(/water|flood|ndwi/.test(q))return 'water';
 if(/built|building|urban|ndbi/.test(q))return 'builtup';
 if(/threshold.*sar|sar.*threshold/.test(q))return 'sar';
 if(/statistics|brightness|intensity|histogram/.test(q))return 'statistics';
 if(/change|difference|before|after|lost|loss|gain/.test(q))return hasResult?current:'change';
 return hasResult?null:'statistics';
}
