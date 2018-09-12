const JSON = require('circular-json');
const async = require('async');
const axios = require("axios");
const Excel = require('exceljs');
const FormData = require('form-data');
let express = require('express');
let app = express();
let server = require('http').createServer(app);
let dl  = require('delivery');
let io = require('socket.io')(server);
let fs = require('fs');
const csv = require('csv-parser');
app.use(express.static(__dirname + '/bower_components'));

module.exports={


tiny: function(a) {
     console.log("control transfered to tinyurl-bulk.js");
  let entries = [];
  let output = [];
  const bufferLimit = 300;
  const parallelLimit = 50;
  const startTime = new Date();

  let url_column = 'A';
  let tinyurl_column = 'B';
  let row_to_read = 1;

  let input_filename = a;
  let output_filename = "output-final.xlsx";
  //let filename = "sheetscombined.xlsx";
  let workbook = new Excel.Workbook();
  let worksheet;

  workbook.xlsx.readFile(input_filename)
    .then(function () {
      // use workbook
      worksheet = workbook.getWorksheet(workbook.worksheets[0].id);
      let entriesbuffer = [];
      worksheet.eachRow(function (row, rowNumber) {
        //if (rowNumber !== 1 && row.getCell(4).value && !row.getCell(5).value) {
        if (rowNumber >= row_to_read && row.getCell(url_column).value && !row.getCell(tinyurl_column).value) {
          entriesbuffer.push({
            rowNumber: rowNumber,
            cell6: row.getCell(url_column).value
          });
          if (entriesbuffer.length === bufferLimit) {
            entries.push(entriesbuffer);
            entriesbuffer = [];
          }
        }
      });
      if (entriesbuffer.length !== 0) {
        entries.push(entriesbuffer);
      }
      // ASYNC QUEUE
      let q = async.queue(getUrl, parallelLimit);
      q.push(entries, (err) => {
        if (err) {
          console.log(err)
        }
      });

      function done() {
        q.drain = null;
        workbook.xlsx.writeFile(output_filename);
        const endTime = new Date();
        console.log("Process took : " + (endTime - startTime) / 1000 + " seconds");
        console.log(output_filename);
        return;
      }
    q.drain = done();
    io.on('connection', function(client) {
        console.log('Client connected...');
        client.on('join', function(data1) {
            //path="sample.csv"
            console.log(data1);
            fs.createReadStream(output_filename)
      .pipe(csv())
      .on('data', function(data){
                console.log(data)
                client.emit("messages", data.URL);
                 console.log("file sent");
      })
      .on('end',function(){
          console.log("finish");
      });
        });
    });
    });

  async function getUrl(task) {
    console.log("task :", task.length + " " + JSON.stringify(task[0]));
    let dataString = {links: []};
    let urlmap = {};
    for (let i = 0; i < task.length; i++) {
      const rxJson = task[i];
      const dataCell6 = rxJson["cell6"];
      dataString.links.push({
        "url": dataCell6,
        "is_secret": "true"
      });
      urlmap[dataCell6] = rxJson["rowNumber"];
    }
    try {
      let form = new FormData();
      form.append('data', JSON.stringify(dataString));
      let data = await axios.post('https://c.pctr.co/api/v2/action/shorten_bulk?key=1fc57286c499f7a78331ced45df54f', form,{headers: form.getHeaders()});
      let result = data.data.result.shortened_links;
      for (let i = 0; i < result.length; i++) {
        const rxJson = result[i];
        worksheet.getCell(tinyurl_column + urlmap[rxJson.long_url]).value = rxJson.short_url;
      }

    } catch (err) {
      console.log(err);
      throw err;
    }
  }
    }
};
