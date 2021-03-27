const bodyParser = require('body-parser');
const Discord = require('discord.js');
const express = require('express');
const Frontly = require('frontly');
const fs = require('fs');
const Datastore = require('nedb');
const app = express();
const client = new Discord.Client();
const db = new Datastore({ filename: 'questions.db', autoload: true });
const meta = `<meta name="theme-color" content="#31b9cf">
<meta name="description" content="View Make Me Smart questions that were submitted from fans on Discord">

<!-- Facebook Meta Tags -->
<meta property="og:url" content="https://mmsquestions.yodacode.repl.co/">
<meta property="og:type" content="website">
<meta property="og:title" content="Make Me Smart | Question Submission Portal">
<meta property="og:description" content="View Make Me Smart questions that were submitted from fans on Discord">
<meta property="og:image" content="https://mmsquestions.yodacode.repl.co/images/mms.jpg">

<!-- Twitter Meta Tags -->
<meta name="twitter:card" content="summary_large_image">
<meta property="twitter:domain" content="mmsquestions.yodacode.repl.co">
<meta property="twitter:url" content="https://mmsquestions.yodacode.repl.co/">
<meta name="twitter:title" content="Make Me Smart | Question Submission Portal">
<meta name="twitter:description" content="View Make Me Smart questions that were submitted from fans on Discord">
<meta name="twitter:image" content="https://mmsquestions.yodacode.repl.co/images/mms.jpg">`;

app.use(Frontly.middleware);
app.use(express.static(__dirname + '/static'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/ping', (req, res) => {
  res.send('Pong!');
});

app.get('/', (req, res) => {
  res.sendFileFrontly(__dirname + '/views/index.html', {
    params: {
      'Color': generateColor(),
      'Meta': meta
    }
  });
});

app.post('/', (req, res) => {
  if (req.body.password !== process.env.PASSWORD) return res.status(403).sendFileFrontly(__dirname + '/views/error.html', {
    params: {
      'Color': generateColor(),
    }
  });
  db.find({}, function (err, docs) {
    var rawData = docs;
    var data = [["Person", "Question"]];
    for (var i = 0; i < rawData.length; i++) {
      data.push([rawData[i].name, rawData[i].question]);
    }
    var icons = [];
    for (var i = 0; i < rawData.length; i++) {
      icons.push(rawData[i].avatar);
    }
    res.sendFileFrontly(__dirname + '/views/dashboard.html', {
      params: {
        'Color': generateColor(),
        'Data': JSON.stringify(data),
        'Icons': JSON.stringify(icons),
        'Password': req.body.password,
      'Meta': meta
      }
    });
  });
});

app.post('/clear', (req, res) => {
  if (req.body.password !== process.env.PASSWORD) return res.status(403).sendFileFrontly(__dirname + '/views/error.html', {
    params: {
      'Color': generateColor(),
      'Meta': meta
    }
  });
  db.remove({}, { multi: true }, function (err, numRemoved) {
    res.sendFileFrontly(__dirname + '/views/removed.html', {
      params: {
        'Color': generateColor(),
        'Password': req.body.password,
        'Removed': numRemoved,
        'Meta': meta
      }
    });
  });
});
/*
const generateColor = (() => {
        function selectColor(colorNum, colors){
            if (colors < 1) colors = 1;
            var hue = (colorNum * (360 / colors) % 360);
            return [hue, 60, 70, "hsl(" + hue + ",60%,70%)"];
        }
        var color = selectColor(Math.floor(Math.random() * 10), 10);
        function hslToHex(h, s, l) {
          l /= 100;
          const a = s * Math.min(l, 1 - l) / 100;
          const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
          };
          return `#${f(0)}${f(8)}${f(4)}`;
        }
        return hslToHex(...color);
      });
      */
const generateColor = () => "#31b9cf";
var questionChannel = fs.readFileSync(__dirname + '/channel.txt', 'utf-8');

function main(message) {
  return new Promise((resolve, reject) => {
    var doc = {
      tag: message.author.tag,
      name: message.member.displayName,
      question: message.content,
      avatar: message.author.displayAvatarURL(),
      id: message.id
    };
    db.insert(doc, (err, newDoc) => {
      if (err) return reject(err);
      resolve(newDoc);
    });
  });
}

app.listen(8080, () => {
  console.log('Open on *:8080');
});

client.on('message', (message) => {
  if (message.author.bot == true) return;
  if (!message.guild) return;
  if (message.content == ">link" && (message.member.hasPermission("ADMINISTRATOR") || message.author.id == "748577964311969923")) {
    fs.writeFileSync(__dirname + '/channel.txt', message.channel.id, 'utf-8');
    questionChannel = message.channel.id;
    return message.channel.send('The question channel has been linked to <#'+message.channel.id+">.");
  }
  if (message.content == ">link") {
    return message.channel.send('Sorry, but only server administrators can manage this bot.');
  }
  if (message.channel.id == questionChannel) {
    main(message).then(() => {
      message.channel.send('Question submitted!');
    }).catch((error) => {
      console.error(error);
      message.channel.send('Oh noes! There was an error!');
    });
  }
});

client.on('ready', () => {
  console.log('Logged in as ' + client.user.tag);
});

client.login(process.env.TOKEN);