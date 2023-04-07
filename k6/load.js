import { Httpx } from 'https://jslib.k6.io/httpx/0.0.3/index.js';
import { findBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { sleep,check} from 'k6';
import { Counter } from "k6/metrics";
//import tracing, { Http } from 'k6/x/tracing';
/**
 * Hipster workload generator by k6
 * @param __ENV.FRONTEND_ADDR
 * @constructor yuxiaoba
 */

let errors = new Counter("errors");



const baseurl = `http://demo.IP_TO_REPLACE.nip.io`;

const tasks = {
    "index": 1,
    "post": 2,
    "browseProduct": 10,
    "addToCart": 2,
    "viewCart": 3,
    "checkout": 1
};


const waittime = [1,2,3,4,5,6,7,8,9,10]

const url=`${__ENV.SERVICE_ADDR}`;


export function setup() {
//  console.log(`Running xk6-distributed-tracing v${tracing.version}`);
}
export const options = {
    discardResponseBodies: true,
    vus: 10,
    duration: '10m',
};

const session = new Httpx({
  baseURL: 'http://'+url,

  timeout: 20000, // 20s timeout.
});

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

export default function() {
   //  const http = new Http({
     //   exporter: "otlp",
       // propagator: "w3c",
         //endpoint: url
      //});
    //Access index page
    for ( let i=0; i<tasks["index"]; i++)
    {
        let res = session.get(`/`);
        let checkRes = check(res, { "status is 200": (r) => r.status === 200 });

        // show the error per second in grafana
        if (checkRes === false ){
            errors.add(1);
        }
        sleep(waittime[Math.floor(Math.random() * waittime.length)]);
    }

    //Create a post
    for ( let i=0; i<tasks["post"]; i++)
    {
        session.addHeader('Content-Type','application/x-www-form-urlencoded')

        let res = session.post(`/`,  { newItem: makeid(5) , button:'Today'});

        let checkRes = check(res, { "status is 302": (r) => r.status === 302 });

        // show the error per second in grafana
        if (checkRes === false ){
            errors.add(1);
        }
        sleep(waittime[Math.floor(Math.random() * waittime.length)])
    }
    let res = session.get(`/`);
    const checkboxid = (res.body, 'input[type="checkbox"] value=\"', '\"',true);
    //Remove item

    session.addHeader('Content-Type','application/x-www-form-urlencoded');
    let max=Math.random() * checkboxid.length;
   for( let i=0 ; i<max;i++)
   {
        let checkboxslected=checkboxid[i];
        res = session.post(`/remove`,{ checkbox:checkboxslected  , listTitle:'Today'});

        let checkRes = check(res, { "status is 302": (r) => r.status === 302 });

        // show the error per second in grafana
        if (checkRes === false ){
            errors.add(1);
        }
    }




}

 export function teardown(){
      // Cleanly shutdown and flush telemetry when k6 exits.
     // tracing.shutdown();
    }