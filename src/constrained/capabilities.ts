import type { Dataset, Mapping, Task } from './engine';
export function supportedTasks(d:Dataset|null,m:Mapping,paired=false):Task[]{
 if(!d)return [];
 const has=(...roles:number[])=>roles.every(i=>Number.isInteger(i)&&i>=0&&i<d.bands.length)&&new Set(roles).size===roles.length;
 const tasks:Task[]=['statistics'];
 if(m.category==='rgb'&&has(m.red,m.green,m.blue))tasks.push('vegetation','water','builtup');
 if(m.category==='multispectral'){
  if(has(m.red,m.nir))tasks.push('vegetation');
  if(has(m.green,m.nir))tasks.push('water');
  if(has(m.swir,m.nir))tasks.push('builtup');
 }
 if(m.category==='sar')tasks.push('sar');
 if(paired)tasks.push('change');
 return tasks;
}
export function recommendedTask(d:Dataset,m:Mapping,paired=false):Task{
 if(paired)return 'change';
 return supportedTasks(d,m).includes('vegetation')&&m.category==='multispectral'?'vegetation':'statistics';
}
