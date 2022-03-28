#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const epub = require('epub-gen');
const clear = require('clear');
const clui = require('clui');
const prompt = require('prompt-sync')();
const cheerio = require('cheerio');
const Progress = clui.Progress;

const getHTML = async function(url){
    let html = await axios.get(url);
    return cheerio.load(html.data)
}

const getBookInfo = async function(url){
    let $ = await getHTML(url)
    return {
        option: {
            title: $('div.section-header-title.me-auto > h2').text(),
            author: [...$('div.novels-detail-right-in-right > a')].filter(ele => ele.attribs.href.includes('author'))[0].children[0].data,
            cover: $('div.novels-detail-left > img').attr().src,
            content: []
        },
        chapterUrlList: [...$('div.cm-tabs-content.novels-detail-chapters > ul > li > a')].map(ele => ele.attribs.href).reverse()
    }
}

const getChapterInfo = async function(url){
    let $ = await getHTML(url);
    $('#chapterText').find('center').remove();
    $('#chapterText').find('div.hidden').remove();
    $('#chapterText').find('p.display-hide').remove()
    return {
        title: $('div.section-header-title.me-auto > span').text().split(":")[0].trim(),
        data: $('#chapterText').html()
    }
}

const makeEpub = async function(baseUrl, book){
    let url = baseUrl + "/" + book
    let progressBar = new Progress(20);
    clear();
    console.log(progressBar.update(0) + "Loading page, please wait...")
    let {option, chapterUrlList} = await getBookInfo(url);
    await getChapterInfo(chapterUrlList[0])
    fs.writeFileSync("info.json", "[\n\t")
    for(let i = 0; i < chapterUrlList.length; i++){
        let content = await getChapterInfo(chapterUrlList[i]);
        let percentComplete = Math.floor(100 * (i+1)/chapterUrlList.length)/100
        let lastChapter = i == chapterUrlList.length -1;
        if(lastChapter){
            fs.writeFileSync("info.json", JSON.stringify(content) + "\n]", {flag: "a"});
        }else{
            fs.writeFileSync("info.json", JSON.stringify(content) + ",\n\t", {flag: "a"});
        }
        clear();
        console.log(progressBar.update(percentComplete) + ` Finished chapter ${content.title}(${i + 1}/${chapterUrlList.length})`)
    }
    option.content = JSON.parse(fs.readFileSync("info.json"))
    new epub(option, `${process.env.HOME}/Documents/Books/${option.title}.epub`)
}

const args = process.argv.slice(2)
let book;
if(args.length < 1){
    book = prompt("Book Title: ").toLowerCase().split(" ").join("-")
} else {
    book = args[0].toLowerCase().split(" ").join("-");
}
makeEpub("https://lightnovelreader.com", book);