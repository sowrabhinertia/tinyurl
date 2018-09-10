var express=require('express');
var app=express();
var upload=require('express-fileupload');
const fs = require('fs');
const csv = require('csv-parser');
var alert=require("alert-node");
const JSON = require('circular-json');
const async = require('async');
const axios = require("axios");
const Excel = require('exceljs');
const FormData = require('form-data');
let entries = [];
let output = [];
const bufferLimit = 300;
const parallelLimit = 50;
const startTime = new Date();

let phone_column = 'A';
let region_column = 'B';
let row_to_read = 1;

const output_filename = "output-final.xlsx";
let workbook = new Excel.Workbook();
let worksheet;

app.use(upload());
app.get('/',function(req,res){
  res.sendfile('inter.html');
})

app.post('/',function(req,res){
  if(req.files){
    var file=req.files.filename;
    var filename1=file.name;
    //console.log(file)
    console.log(filename1)
    file.mv("./upload/"+filename1,function(err){
      if(err){
        console.log("err");
        res.send("error occured");
      }
      else{
          res.write("<table frame=box>");
        res.write("<center><b><font size=5 color=black>Your file is uploaded & processing</br>This may take a time....</br>After processing the output file will be downloaded automatically</font></b></center>");

         res.write("</table>");


        let input_filename = filename1;
        workbook.xlsx.readFile(input_filename)
          .then(function () {
            worksheet = workbook.getWorksheet(workbook.worksheets[0].id);
            let entriesbuffer = [];
            worksheet.eachRow(function (row, rowNumber) {
              if (rowNumber >= row_to_read && row.getCell(phone_column).value && !row.getCell(region_column).value) {
                entriesbuffer.push({
                  rowNumber: rowNumber,
                  cell6: row.getCell(phone_column).value
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
             res.download(output_filename);
             console.log('output file downloaded')
            }

            q.drain = done;
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
              worksheet.getCell(region_column + urlmap[rxJson.long_url]).value = rxJson.short_url;
            }

          } catch (err) {
            console.log(err);
            throw err;
          }
        }

      }
    })
  }
})
app.listen(3080);
console.log('server running on port 3080');
