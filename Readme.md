current prompts to be integrated to the agent SDK

## First cycle:

The following is a feed of engineering blogs can you use grep to search for the following:

title of blog
URL of blog
date of the blog

The date data doesn't necessarily have to be in the format of date. Time indicators such as # days ago, # mins ago, etc would work too, just need to somehow signal recency. Remember case insensitive matching, if you are trying to match by day, or month for example, (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec) not just matching to capitalized or not capitalized versions. And if you can't find this, look again, possible try to search near to the blog titles, because almost everytime the articles have dates. Don't assume that the date is wrapped in special tags like <time>

Understan that this could very much be a single mega line. So we cannot simply search for lines, because that could actually be the 

So what I am saying is not only should you try to find these elements, but if possible, look let's say 2000 characters before, or after, if you can't find any of the three elements that I requested, from the ones that you can find. Because usually, these would be coupled close to each other.

These are important, and this prompt is built based on iteration from lots of examples, analyzing failures and successes, so you should try to follow it

And then can you analyze how, if we are to build a scraper with cheerio. operating on the file, how would we select these things, such that we can get an array of

the objects with
title, date, and URL

This is a very long HTML, hence why I want you to use grep and be smart, since it is not possible to read the whole HTML file. Understand that this could be a very mega

Investigate, and let me know, this is the file: <name>.html

## Second cycle


please create a folder <name>_scraper, iniitalize it as an npm project, I want you to run the code against the HTML, and get the array of URL, title, and date, the order being found topmost to bottom of the file. SO I want the output to be <name>.json, and it is a single array of thsoe objects.  I want you to actually run it, and then inspect the resulting JSON. in particular, I am assuming that for each of the fields title, url, and date, if there is a value for one item, then there should be a value for all. So my main assumption is that if some are null, while some are filled, then there must be a change needed to be made to the scraper. To which you should reinvestigate the source of the problem, and fix the scraper, and repeat this until we. have full consistency. just note that when you run npm commands, you need to make sure to use the latest node. usually I do nvm use node, if it is in zsh
