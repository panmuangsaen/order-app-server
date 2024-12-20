const express = require('express');
const { Queue, Worker, QueueScheduler } = require('bullmq');
const Redis = require('ioredis');
const cors = require('cors');

const app = express();
const port = 5001;
let currentOrder = '';

// Redis connection
const redis = new Redis({
  host: 'localhost', // Make sure Redis is running locally or configure your Redis instance
  port: 6379,
});

// Define the queue
const bidderQueue = new Queue('bidderQueue', {
    redis: { host: 'localhost', port: 6379 },
});

// // Define the worker to process jobs from the queue
const bidderWorker = new Worker(
    'bidderQueue',
    async (bidder) => {
    console.log('Processing bidder:', bidder.id);
    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('bidder processed:', bidder.id);

    const orderQueueLength = await orderQueue.getWaiting()
    
    console.log('length: ', orderQueueLength.length)
    if(orderQueueLength.length > 0){
        if(orderWorker.isPaused()){
            console.log('order worker paused')
            orderWorker.resume()
        }else{
            console.log('order worker start')
            if(!orderWorker.isRunning()){
                orderWorker.run()
            }
        }
    }
    await bidderQueue.add(bidder.name, {onlineTimestamp: Date.now()})
    console.log('bidderworker pause length: ', orderQueueLength.length)
    if(orderQueueLength.length == 1){
        bidderWorker.pause()
    }
  },
  {
    connection: { host: 'localhost', port: 6379 },
    autorun:false
  }
);
// bidderWorker.on('completed', async ()=>{
    //     const orderQueueLength = await orderQueue.getWaiting()
    //     console.log('order queue waiting length ', orderQueueLength.length)
    //     if(orderQueueLength.length > 0){
    //         if(orderWorker.isPaused()){
    //             console.log('order worker paused')
    //             orderWorker.resume()
    //         }else{
    //             console.log('order worker start')
    //             orderWorker.run()
    //         }
    //     }else{
    //         bidderWorker.pause()
    //     }
    // })

// Define the queue
const orderQueue = new Queue('orderQueue', {
    redis: { host: 'localhost', port: 6379 },
});

// // Define the worker to process jobs from the queue
const orderWorker = new Worker(
  'orderQueue',
  async (order) => {
    console.log('Processing order:', order.id);
    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('Order processed:', order.id);
    orderWorker.pause()
  },
  {
    connection: { host: 'localhost', port: 6379 },
    autorun:false
  }
);

// Queue Scheduler (optional but recommended to handle stalled jobs)
// const scheduler = new QueueScheduler('orderQueue', {
//   redis: { host: 'localhost', port: 6379 },
// });
app.use(cors({
    origin: 'http://localhost:3000',  // Allow requests from React frontend (adjust if your frontend is hosted elsewhere)
    methods: ['GET', 'POST'],         // Allow GET and POST methods
    allowedHeaders: ['Content-Type'], // Allow Content-Type header
  }));
  
  // Body parser middleware to parse JSON requests
  app.use(express.json());
  async function checkBidderQueueJobs() {
      try {
          // Get the first 10 jobs in the waiting state
          const waitingJobs = await bidderQueue.getWaiting(0, 10);
          console.log('Waiting Bidders:', waitingJobs.map((job)=>{return job.name + ' ' + job.data.onlineTimestamp}));
  
      // Get the first 10 jobs in the active state
      const activeJobs = await bidderQueue.getActive(0, 10);
      console.log('Active Bidders:', activeJobs.map((job)=>{return job.name + ' ' + job.data.onlineTimestamp}));
      
      // Get the first 10 jobs in the completed state
      const completedJobs = await bidderQueue.getCompleted(0, 10);
      console.log('Completed Bidders:', completedJobs.map((job)=>{return job.name + ' ' + job.data.onlineTimestamp}));
      
      // Get the first 10 jobs in the failed state
      const failedJobs = await bidderQueue.getFailed(0, 10);
      console.log('Failed Bidders:', failedJobs.map((job)=>{return job.name + ' ' + job.data.onlineTimestamp}));
      console.log('\n')
    } catch (error) {
      console.error('Error checking queue jobs:', error);
    }
  }

  async function checkOrderQueueJobs() {
    try {
      // Get the first 10 jobs in the waiting state
      const waitingJobs = await orderQueue.getWaiting(0, 10);
      console.log('Waiting Orders:', waitingJobs.map((job)=>{return job.id + ' ' + job.name + ' ' + job.data.onlineTimestamp}));
  
      // Get the first 10 jobs in the active state
      const activeJobs = await orderQueue.getActive(0, 10);
      console.log('Active Orders:', activeJobs.map((job)=>{return job.id + ' ' + job.name + ' ' + job.data.onlineTimestamp}));
  
      // Get the first 10 jobs in the completed state
      const completedJobs = await orderQueue.getCompleted(0, 10);
      console.log('Completed Orders:', completedJobs.map((job)=>{return job.id + ' ' + job.name + ' ' + job.data.onlineTimestamp}));
  
      // Get the first 10 jobs in the failed state
      const failedJobs = await orderQueue.getFailed(0, 10);
      console.log('Failed Orders:', failedJobs.map((job)=>{return job.id + ' ' + job.name + ' ' + job.data.onlineTimestamp}));
      console.log('----------------------------------')
    } catch (error) {
        console.error('Error checking queue Orders:', error);
    }
}

// API endpoint to add an order to the queue
app.post('/create-bidder', async (req, res) => {
    try {
        const { user, online } = req.body
        console.log(user)
        console.log('create bidder')
        const onlineTimestamp = Date.now(); // Use a timestamp as the order ID
        if(online){
            const resultQueue = await bidderQueue.add(user, { onlineTimestamp });
            res.status(200).json({ message: 'Bidder added to queue', id: resultQueue.id });
        }else{
            res.status(200).json({ message: 'Bidder added to queue', onlineTimestamp });
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error adding bidder to queue', error });
    }
});
app.get('/get-order', async (req, res) => {
    try {
        console.log('\n')
        console.log('----------------------------------')
        await checkBidderQueueJobs()
        await checkOrderQueueJobs()
        res.status(200).json({ message: 'Order logged'});
    } catch (error) {
        res.status(500).json({ message: 'Error logging order', error });
    }
});
app.post('/create-order', async (req, res) => {

    console.log('create order')
    const onlineTimestamp = Date.now(); // Use a timestamp as the order ID
    await orderQueue.add('orderQueue', { onlineTimestamp });
    try {
    if(bidderWorker.isPaused()){
        bidderWorker.resume()
    }else{
        if(!bidderWorker.isRunning()){
            bidderWorker.run()
        }
    }

    res.status(200).json({ message: 'Order added to queue', onlineTimestamp });

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Error adding order to queue', error });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
