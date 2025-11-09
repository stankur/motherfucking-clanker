current prompts to be integrated to the agent SDK

## First cycle:

The following is a feed of engineering blogs can you use grep to search for the following:

title of blog
URL of blog
date of the blog

The date data doesn't necessarily have to be in the format of date. Time indicators such as # days ago, # mins ago, etc would work too, just need to somehow signal recency. Remember case insensitive matching, if you are trying to match by day, or month for example, (jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec) not just matching to capitalized or not capitalized versions. And if you can't find this, look again, possible try to search near to the blog titles, because almost everytime the articles have dates. Don't assume that the date is wrapped in special tags like <time>

So what I am saying is not only should you try to find these elements, but if possible, look let's say 2000 characters before, or after, if you can't find any of the three elements that I requested, from the ones that you can find. Because usually, these would be coupled close to each other.

These are important, and this prompt is built based on iteration from lots of examples, analyzing failures and successes, so you should try to follow it

And then can you analyze how, if we are to build a scraper with cheerio. operating on the file, how would we select these things, such that we can get an array of

the objects with
title, date, and URL

This is a very long HTML, hence why I want you to use grep and be smart, since it is not possible to read the whole HTML file. Understand that this could be a very megaline.

The other important bit is to investigate whether there seems to be a 'next page', or some indicator that this HTML is not the only page of the blog, and if there is a next page, do specify how we can go to the next page, so that in the cheerio scraper, we could use iterate and use the function in @render-fetch.js to fetch the content of the next page, and scrape again. If we use this, we would not be scraping from the file I give you though, in the subseqent pages, we would need to deifne the naming scheme on our own.

Note that if you use render-fetch function, you must use the variant that specify the destination. sand have the naming convention so that you know where to look for the fetched html in each iteration.

If you find an empirical pattern in the URL for getting the different, and you know the max page, you don't need to do aything with the next button, just iterate through the patterns directly, and fetch using render fetch

Investigate, and let me know, this is the file: <name>.html

## Second cycle


please create a folder <name>_scraper, iniitalize it as an npm project, I want you to run the code against the HTML, and get the array of URL, title, and date, the order being found topmost to bottom of the file. SO I want the output to be <name>.json, and it is a single array of thsoe objects.  I want you to actually run it, and then inspect the resulting JSON. in particular, I am assuming that for each of the fields title, url, and date, if there is a value for one item, then there should be a value for all. So my main assumption is that if some are null, while some are filled, then there must be a change needed to be made to the scraper. To which you should reinvestigate the source of the problem, and fix the scraper, and repeat this until we have full consistency. Unless you are totally sure that is meant ot be after thorough investigation. 

if there is pagination, handle it immediately in this turn, don't ask for my confirmation, because you will be running autonomously, and I can't make more chat turns. So you need to be complete.

Please output the json file in the same directory, not the root, and update it incrementally, if there are multiple pages

For now, instead of using all the pages, if there are multiple pages, I want you to put a max of 3, since we are just testing out
