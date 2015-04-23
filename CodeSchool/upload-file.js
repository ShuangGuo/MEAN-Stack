/**
 * Created by guest on 4/21/15.
 */
var fs = require('fs');
var http = require('http');
http.createServer(function (request, response){
    var newFile = fs.createWriteStream("readme_copy.txt");
    var fileBytes = request.headers['content-length'];
    var uploadedBytes = 0;

    request.on('readable', function(){
        var chunk = null;
        while(null !== (chunk = request.read())) {
            uploadedBytes += chunk.length;
            var progress = (uploadedBytes / fileBytes) * 100;
            response.write("progress: " + parseInt(progress, 10) + "%\n");
        }
    });
    request.pipe(newFile);
}).listen(8080);














