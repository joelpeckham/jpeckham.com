---
title: "GPT-Powered Stock Trading Research"
ShowBreadCrumbs: true
---

[Read the full paper PDF](/joel_peckham_evaluating_transformer_networks_2022.pdf).
![newspaper](../images/NewspaperTransparent.webp)

## Background

Back in the dark ages (yes, I mean before Chat-GPT took the internet by storm), transformer-based text generation models were known only to AI researchers and the nerdiest of programmers. It took until the release of OpenAi’s GPT-2 in early 2019 before I joined the hype train. Like everyone else at the time, I wanted to co-opt the power of transformers for fun and profit, but alas OpenAi was only allowing other big-time researchers, or deep-pocketed corporations access to their groundbreaking technology. Thankfully in the meantime, [Ben Wang](https://github.com/kingoflolz) and [Aran Komatsuzaki](https://twitter.com/arankomatsuzaki) were assembling a crack team of open-source gods to compete with OpenAI. Working a breakneck pace, they released [GPT-J](https://arankomatsuzaki.wordpress.com/2021/06/04/gpt-j/), a free and open competitor to GPT-2 and GPT-3 by early 2021, just in time for me to make use of their work in my [senior research project](/joel_peckham_evaluating_transformer_networks_2022.pdf) for my college degree.

#### Timeline

![Timeline](../images/transformerTimeline.svg)
<!-- add image with img tag -->
<img src="../images/transformerTimeline.svg" alt="Timeline" width="100vw"/>

## My Research Project

#### Concept

In mid 2021, there was lots of excitement around the flexibility of large transformer models. I wanted to see if I could use GPT-J as an all-in-one news-based trading bot. The idea being, if the model has read enough of the internet as background, it should understand the context of a news article, and output a trading signal for a given company. 

Input: News article about a company  ⮕  Output: Buy/Sell/Neutral signal

#### Data gathering

For the best chance of success, I decided to fine-tune the GPT-J-6B model with data formatted like the prompts I intented to test with. I scraped and labelled 140,000 news articles from the below web sources:
![Data Sources](../images/domainCounts.jpg)

To avoid rate limiting, I created a custom web scraper to use and manage a pool of rotating proxies. I also used a custom rate limiter to ensure that I was not making too many requests to any given domain. Running the scraper from an OracleVM, I was able to scrape around 40 articles per minute and complete all 140,000 articles in around 2.5 days.

```<python3> 
class Scraper:
    """
    Scrapes a list of seed urls and calls the parser function to process each result.
    The parser function should accept two arguments: the response object and the url.
    The parser may pass a list of new urls to scrape with the addUrls(urls) method.
    The scraper attempts to never scrape the same url twice.
    """
    def __init__(self, seedURLs = [], parser = None, options = None):
        emptyLogFile()
        self.options = {
            'cookieDirectory': './cookies/',
            'scrapeThreads': 10,
            'rateLimits': {},
            'maxAttempts': 3,
            'proxyUpdateInterval': 10
        }
        if options:
            self.options.update(options)
        
        self._cookies = loadCookies(self.options['cookieDirectory'])
        self._parser = parser

        self._urlQueue = queue.PriorityQueue() # Priorty queue of urls to scrape. Priority is based on the number of times a url has requested.
        self._finishedUrls = {} # Dictionary of urls that have been scraped or have been attempted the max number of times.
        self._finishedUrlsLock = threading.Lock()
        self.addUrls(seedURLs)

        self._threadNumber = self.options['scrapeThreads']

        # Current queue of proxy sessions. Periodically updated.
        self._proxySessions = queue.Queue()
        for proxy in self.verifyProxies(self.getProxies()):
            self._proxySessions.put(proxy)

        # Dictionary of domains and their rate limits and the last time a request was made.
        self._rateLimits = {}
        self._rateLimitsLock = threading.Lock()
        for domain in self.options['rateLimits']:
            self._rateLimits[domain] = {
                'limit': self.options['rateLimits'][domain],
                'lastRequest': {}
            }

        logging.debug("Initialized scraper with " + str(self._threadNumber) + " threads.")

    def addUrls(self, urls):
        """ Adds a list of urls to the list of urls to scrape. """
        count = 0
        with self._finishedUrlsLock:
            for url in urls:
                if url not in self._finishedUrls:
                    self._urlQueue.put((0, url))
                    count += 1

        logging.debug("Added " + str(count) + " urls to the queue.")

    def _scrape(self):
        """
        Scraping thread worker.
        Scrapes urls from the list of urls and calls the parser function.
        """
        while True:
            if self._urlQueue.empty(): break
            attempts, url = self._urlQueue.get()
            domain = tldextract.extract(url).domain + '.' + tldextract.extract(url).suffix
            if self._proxySessions.empty(): continue
            session = self._proxySessions.get()
            with self._rateLimitsLock:
                sessionKey = repr(session)
                if domain in self._rateLimits:
                    if sessionKey in self._rateLimits[domain]['lastRequest']:
                        if max(time.time() - self._rateLimits[domain]['lastRequest'][sessionKey],0) <= self._rateLimits[domain]['limit']:
                            self._urlQueue.put((attempts, url))
                            continue
                        else:
                            self._rateLimits[domain]['lastRequest'][sessionKey] = time.time()
                    else:
                        self._rateLimits[domain]['lastRequest'][sessionKey] = 0
                else:
                    self._rateLimits[domain] = {
                        'limit': 0,
                        'lastRequest': {}
                    }

            try:
                r = session.get(url, timeout=10)
                if r.status_code == 200:
                    if self._parser: self._parser(r, url, domain, self.addUrls)
                    self._finishedUrls[url] = True
                elif r.status_code == 429:
                    self._urlQueue.put((attempts, url))
                    with self._rateLimitsLock:
                        self._rateLimits[domain]['limit'] = int(r.headers.get('Retry-After')) or int(r.headers.get('x-retry-after')) or self._rateLimits[domain]['limit'] + 0.5
                        logging.warning("429 Occured with url " + url + " Rate limit for " + domain + " is now " + str(self._rateLimits[domain]['limit']) + " seconds.")
                elif r.status_code == 404:
                    self._finishedUrls[url] = False
                else:
                    raise Exception("Unexpected status code: " + str(r.status_code) + " for url: " + url)
            except Exception as e:
                attempts += 1
                if attempts < self.options['maxAttempts']:
                    self._urlQueue.put((attempts, url))
                else:
                    self._finishedUrls[url] = False
                logging.warning("Error scraping " + url + " Attempts: " + str(attempts) + " with proxy " + str(session.proxies) + ": " + str(e))
            self._proxySessions.put(session)
            
    def getProxies(self):
        """Gets proxies from https://www.socks-proxy.net/"""
        sourceURL5 = 'http://list.didsoft.com/get?email=joelskyler@gmail.com&pass=u3t3mm&pid=socks1100&showcountry=no&version=socks5'
        r = requests.get(sourceURL5)
        data5 = r.text.split('\n')
        return [{'http': 'socks5://' + x, 'https': 'socks5://' + x} for x in data5 if x != '']

    def _verifyProxy(self, proxy, url, timeout=5, verifiedProxies={}):
        """ Verifies a proxy is workinng by requesting a url. """
        try:
            # Create new sesssion with proxy
            session = requests.Session()
            session.proxies = proxy
            session.headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Connection': 'keep-alive',
            }
            session.cookies = self._cookies
            r = session.get(url, timeout=timeout)
            if r.status_code == 200:
                verifiedProxies[repr(proxy)] = session
        except Exception as e:
            logging.warning("Error verifying proxy " + repr(proxy) + " for url " + url + "Exception" + str(e))

    def verifyProxies(self, proxies):
        """ Verifies a list of proxies. """
        verifiedProxies = {}
        proxyQueue = queue.Queue()
        for proxy in proxies:
            proxyQueue.put(proxy)
        
        threadNum = len(proxies)
        threads = []
        for i in range(threadNum):
            t = threading.Thread(target = self._verifyProxy, args = (proxyQueue.get(), 'https://www.ft.com/', 25, verifiedProxies))
            threads.append(t)
            t.start()
        
        for t in threads:
            result = t.join()

        goodProxies = verifiedProxies.values()
        logging.debug("Verified " + str(len(goodProxies)) + " proxies.")
        print("Verified " + str(len(goodProxies)) + " proxies.")
        return goodProxies

    def _maintainProxies(self):
        """
        Periodically updates the list of proxies.
        """
        lastTimeUpdated = time.time()
        while True:
            if self._urlQueue.empty():
                break
            time.sleep(1)
            if time.time() - lastTimeUpdated > 60 * self.options['proxyUpdateInterval']:
                newProxies = self.verifyProxies(self.getProxies())
                # Empty the queue of proxies.
                while not self._proxySessions.empty():
                    self._proxySessions.get()
                # Add the new proxies to the queue.
                for proxy in newProxies:
                    self._proxySessions.put(proxy)
                lastTimeUpdated = time.time()
    
    def _progress(self):
        """
        Periodically prints the progress of the scraping.
        """
        while not self._urlQueue.empty():
            queueSize = self._urlQueue.qsize()
            with self._finishedUrlsLock:
                finishedUrls = len(self._finishedUrls)
            progressString = "Progress: " + str(finishedUrls) + " Remaining: " + str(queueSize)
            print("\r"+" "*len(progressString)+"\r"+progressString, end="")
            time.sleep(0.1)
        
    def run(self):
        """ Starts the scraping threads and the proxy maintenance thread. """
        scrapingThreads = []
        for i in range(self._threadNumber):
            t = threading.Thread(target = self._scrape)
            t.start()
            scrapingThreads.append(t)
        
        proxyMaintThread = threading.Thread(target = self._maintainProxies)
        proxyMaintThread.start()

        progressThread = threading.Thread(target = self._progress)
        progressThread.start()

        for t in scrapingThreads:
            t.join()
        proxyMaintThread.join()
        progressThread.join()
        successfulScrapes = len([v for v in self._finishedUrls.values() if v])
        print(f"\nFinished scraping. {len(self._finishedUrls)} urls scraped. {successfulScrapes} successful scrapes.")
```

I then spit my dataset into a training set with 90,000 articiles and into validation/testing sets with 10,000/40,000 articles respectively.

## Training

Because the model weights are over 60GB, specilized computing was required for this training task. Training was done with a Google TPU-v3 generously donated by Google's [TPU Research Cloud](https://sites.research.google/trc/about/). I trained my model using the following hyperparameters:
```<json>
{
  "layers": 28,
  "d_model": 4096,
  "n_heads": 16,
  "n_vocab": 50400.

  "warmup_steps": 160,
  "anneal_steps": 1530,
  "lr": 1.2e-4,
  "end_lr": 1.2e-5,
  "weight_decay": 0.1,
  "total_steps": 1700,

  "tpu_size": 8,

  "bucket": "peckham_tpu_europe",
  "model_dir": "mesh_jax_stock_model_slim_f16",

  "train_set": "stocks.train.index",
  "val_set": {
    "stocks": "stocks.val.index"
  },

  "val_batches": 5777,
  "val_every": 500,
  "ckpt_every": 500,
  "keep_every": 10000
}
```
#### Training Loss
I was encouraged by the seeing a meaningful decrease in training loss, however now I believe this was due to overfitting to the training set. 
![Training Loss](../images/trainLoss.png)

## Results

Fine-tuned model:  
**50.58%** (N=40K)
correct guesses of stock price movement direction.

Standard GPT-J model:  
**50.63%** (N=40K)
correct guesses of stock price movement direction.

Human testing:  
**56%** (N=120)
correct guesses of stock price movement direction.

## Conclusion

In my testing, GPT-J performs no better than random when predicting the direction of price movement based on a news story. Furthermore, fine-tuning the model does not improve prediction accuracy. 

I believe these results are due to the following factors:
- The model (except for a small amout of fine tuning) is not trained on financial data.
- The data was not cleaned well enough to remove noise.
- Text data is not a good representation of financial data. In other words, the model doesn't care about the actual numbers, only how well they "sound" in the context of the article.
- The articles may also not have enough infomation to predict price movement anyway. News is often considered a lagging indicator of price movement, and the articles I scraped were often published after the relevant price movement had already occured.

