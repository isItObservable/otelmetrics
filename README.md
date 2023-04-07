# Is it Observable
<p align="center"><img src="/image/logo.png" width="40%" alt="Is It observable Logo" /></p>

## Episode : How to produce metrics with OpenTelemetry
This repository contains the files utilized during the tutorial presented in the dedicated IsItObservable episode related to OpenTelemetry Metrics.
<p align="center"><img src="/image/opentelemetry-stacked-color.png" width="40%" alt="OpenTelemetry Logo" /></p>

What you will learn
* How to create [OpenTelemetry Metrics](https://opentelemetry.io/docs/concepts/signals/metrics/)

This repository showcase the usage of OpenTelemetry Metrics  with :
* The OpenTelemetry Operator
* Nginx ingress controller
* Dynatrace
* Prometheus Operator
* NodeJs demo application : todo

We will send all Telemetry data produced by the todo application to Dynatrace.

## Prerequisite
The following tools need to be install on your machine :
- jq
- kubectl
- git
- gcloud ( if you are using GKE)
- Helm


## Deployment Steps in GCP

You will first need a Kubernetes cluster with 2 Nodes.
You can either deploy on Minikube or K3s or follow the instructions to create GKE cluster:
### 1.Create a Google Cloud Platform Project
```shell
PROJECT_ID="<your-project-id>"
gcloud services enable container.googleapis.com --project ${PROJECT_ID}
gcloud services enable monitoring.googleapis.com \
    cloudtrace.googleapis.com \
    clouddebugger.googleapis.com \
    cloudprofiler.googleapis.com \
    --project ${PROJECT_ID}
```
### 2.Create a GKE cluster
```shell
ZONE=europe-west3-a
NAME=isitobservable-fluentbitv2
gcloud container clusters create "${NAME}" --zone ${ZONE} --machine-type=e2-standard-2 --num-nodes=3 
```


## Getting started
### Dynatrace Tenant
#### 1. Dynatrace Tenant - start a trial
If you don't have any Dyntrace tenant , then i suggest to create a trial using the following link : [Dynatrace Trial](https://bit.ly/3KxWDvY)
Once you have your Tenant save the Dynatrace tenant hostname in the variable `DT_TENANT_URL` (for example : https://dedededfrf.live.dynatrace.com)
```
DT_TENANT_URL=<YOUR TENANT URL>
```

#### 2. Create the Dynatrace API Tokens
Create a Dynatrace token with the following scope ( left menu Acces Token):
* ingest metrics
* ingest OpenTelemetry traces
* ingest logs
<p align="center"><img src="/image/data_ingest.png" width="40%" alt="data token" /></p>
Save the value of the token . We will use it later to store in a k8S secret

```
DATA_INGEST_TOKEN=<YOUR TOKEN VALUE>
```
### 3.Clone the Github Repository
```shell
https://github.com/isItObservable/otelmetrics
cd otelmetrics
```
### 4.Deploy most of the components
#### Define a user and Password for mongo
```shell
MONGOUSER=<your user of your choice>
MONGOPWD=<YOUR password of your choice>
```
#### Deploy
The application will deploy the otel demo v1.2.1
```shell
chmod 777 deployment.sh
./deployment.sh  --clustername "${NAME}" --dturl "${DT_TENANT_URL}" --dttoken "${DATA_INGEST_TOKEN}" --mongouser "${MONGOUSER}" --mongopwd "${MONGOPWD}"
```
### 5.Create metrics

#### 1. Define the MeterProvider

Udpate the `instrumentation.js` located in : `src/instrumentation.js`
Add the following lines :
```js

const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({temporalityPreference: AggregationTemporality.DELTA}),
    exportIntervalMillis: 3000,
});

const myServiceMeterProvider = new MeterProvider({
    resource: resource,
});

myServiceMeterProvider.addMetricReader(metricReader);
otel.metrics.setGlobalMeterProvider(myServiceMeterProvider)
```
#### 2. Define A meter
In the `app.js` file located in : ` src/app.js`
Let's define a meter by adding the following line of code: 
```js
const meter = otel.metrics.getMeter('Todo-demo');
```
#### 3. Define Instruments

##### Counter
Let's create 2 counter, reporting :
- the number of todo created
  ```js
  const counter_item_total=meter.createCounter('todo.item.created.total',{
       description: 'Total number of item created',
       unit: 'items',
    });
  ```
- the number of todo deleted
  ```js
  const counter_item_deleted_total=meter.createCounter('todo.item.deleted.total',{
        description: 'Total number of item deleted',
        unit: 'items',
     });  
  ```
Then we can define both metrics in 2 different section :
- Creating item:
after :
  ```js
  app.post("/", function (req, res) {
  const newItemName = req.body.newItem;
  const listTitle = req.body.button;
  const newItem = new Item({
    name: newItemName,
  });

  if (listTitle === "Today") {
    newItem.save();
  ```
  replace the line `newItem.save()` by:
  ```js
  newItem.save(function(err,result){
      if(err){
        console.log(err);
      }
      else{
        const label = { 
                  list_title: listTitle
                  };
        counter_item_total.add(1,label);
      }
  });
   ```
- Removing item:
we will replace :
  ```js
  app.post("/remove", function (req, res) {
  const checkboxValue = req.body.checkbox;
  const listTitle = req.body.listTitle;

  if (listTitle === "Today") {
  Item.deleteOne({ _id: checkboxValue }, function (err) {
    console.log(err);
    });
  ```
  by:
  ```js
  app.post("/remove", function (req, res) {
  const checkboxValue = req.body.checkbox;
  const listTitle = req.body.listTitle;

  if (listTitle === "Today") {
  Item.deleteOne({ _id: checkboxValue }).then( ()=> {
    const label = { 
                    list_title: listTitle
                };
    counter_item_deleted_total.add(1,label);
  }
  ).catch(function (err) {
    console.log(err);
    });
  ```
##### Gauge
For this example we will create a Gauge metric to report the latency to :
- save a document in mongo database
- remove a document in mongo database
For this we can create only one Gauge Metric with a label to seperate the type of operation by adding label with the operation type.
  ```js
  const mongo_operation_latency=meter.createObservableGauge('mongo.operation.latency',{
  description: 'latency in ms',
  unit: 'ms',
  });
  ```
Replace the following line:
```js
  newItem.save(function(err,result){
    if(err){
       console.log(err);
    }
    else{
      const label = { 
          list_title: listTitle
      };
      counter_item_total.add(1,label);
    }
  });
```
by:
```js
  start=Date.now()
  newItem.save(function(err,result){
    if(err){
       console.log(err);
    }
    else{
      const elapse =Date.now() - start
      const label = { 
          list_title: listTitle
      };
      const labeloperation = { 
          database: 'todo', operation: 'save'
      };
      counter_item_total.add(1,label);
       mongo_operation_latency.addCallback(
                                          (result) => {
                                            result.observe(elapse,labeloperation)
                                          }
                                        )
    }
  });
```
and for removing item, replace: 
  ```js
  app.post("/remove", function (req, res) {
  const checkboxValue = req.body.checkbox;
  const listTitle = req.body.listTitle;

  if (listTitle === "Today") {
  Item.deleteOne({ _id: checkboxValue }).then( () => {
    const label = {
                    list_title: listTitle
                };
    counter_item_deleted_total.add(1,label);
    }
  ).catch(function (err) {
    console.log(err);
    });
  ```
by:
  ```js
  app.post("/remove", function (req, res) {
  const checkboxValue = req.body.checkbox;
  const listTitle = req.body.listTitle;

  if (listTitle === "Today") {
  cont start= Date.now();
  Item.deleteOne({ _id: checkboxValue }).then( => {
    const elapse= Date.now() - start;
    const label = { 
                    list_title: listTitle
                };
    const labeloperation = { 
          database: 'todo', operation: 'delete'
      };
    counter_item_deleted_total.add(1,label);
    mongo_operation_latency.addCallback(
                                          (result) => {
                                            result.observe(elapse,labeloperation)
                                          }
                                        )
    }
  ).catch(function (err) {
    console.log(err);
    });
  ```
### 6.Create the new Container image 
Rebuild the container and update the `manifest/deployment.yaml`
```shell
cd src
docker build . - t <your docker registry>/todoapp-node:0.2
docker push <your docker registry>/todoapp-node:0.2
```
Update the deployment of the application to use your container image :
```shell
sed -i "s,hrexed/todoapp-node:0.1,<your docker registry>/todoapp-node:0.2," manifest/deployment.yaml
```
### 7.Re-Deploy
Deploy the upated workload:
```shell
kubectl apply -f manifest/deployment.yaml -n todo
```
<p align="center"><img src="/image/graph.png" width="40%" alt="Custom metrics" /></p>
