const Task = require('./task')
const TaskRunner = require('./task-runner')

function delayedResolve(value){
  return new Promise((resolve,reject)=>{
    setTimeout(()=>{resolve(value)}, Math.random()*9000)
  })
}

let taskA = new Task({
  name: 'a',
  depends: ['b', 'd'],
  exec: ()=>{return delayedResolve('aA') }
})

let taskB = new Task({
  name: 'b',
  exec: ()=>{ return delayedResolve('bB') }
})

let taskC = new Task({
  name: 'c',
  exec: ()=>{ return delayedResolve('cC') }
})

let taskD = new Task({
  name: 'd',
  depends: ['c'],
  exec: ()=>{ return delayedResolve('dD') }
})

let taskE = new Task({
  name: 'e',
  exec: ()=>{ return delayedResolve('eE') }
})

let runner = new TaskRunner()

runner.addTask(taskA)
runner.addTask(taskB)
runner.addTask(taskC)
runner.addTask(taskD)
runner.addTask(taskE)


let order = runner.runOrder

console.log(order)

let taskDone = function(task){
  console.log('\t done task - ', task.name)
}

let taskRun = function(task){
  console.log('\t run task - ', task.name)
}

taskA.on('running', taskRun)
taskB.on('running', taskRun)
taskC.on('running', taskRun)
taskD.on('running', taskRun)
taskE.on('running', taskRun)

taskA.on('done', taskDone)
taskB.on('done', taskDone)
taskC.on('done', taskDone)
taskD.on('done', taskDone)
taskE.on('done', taskDone)

runner.on('running', ()=>{ console.log('running TaskRunner - ',runner.taskOrder) })
runner.on('idle', ()=>{ console.log('idle TaskRunner - ',runner.taskOrder) })

runner.start().then(console.log).catch(console.log)

