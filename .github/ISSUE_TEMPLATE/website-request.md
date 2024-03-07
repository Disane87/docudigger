---
name: Website request
about: Request for a new website to be scraped
title: "[WR] website.tld"
labels: enhancement, plugin
assignees: ''

---

# Website request
To add a scraper for a specific webpage, we need some informations about the page.

## Basic information
### Which website to you want to crawl? 
We need the entire domain with TLD to crawl like 

### What services do they provide?
- [ ] Orders (with n invoices)
- [ ] Contracts (with recurring calculation in a defined interval)

### In which industry does the company operate?
- [ ] Commerce (like amazon etc.)
- [ ] Energy (i.e. your local energy company)
- [ ] Telecommunication (like Vodafone)
- [ ] other (Please describe here: _________)

### Does the webpage have/needs an authentication?
- [ ] yes
- [ ] no

### Do they provide a two factor auth?
Currently scraping documents via Docker container doesn't work with a seconds factor. We need this information to config this plugins as a 2fas-able one.
- [ ] yes
- [ ] no

### Do you provide us the credentials (privately)?
- [ ] yes
- [ ] no

### Are you willing to collaborate to get this scraper up and running?
- [ ] yes
- [ ] no

### What color (hex) represents the company? 
This is needed for a specific tag for this website and logs in the application.
If you're unsure about this, please head up to https://www.color-hex.com/color-palettes/ and check if you find the main color of the company.

## Record the way you download your documents
The chance is pretty high, we don't use your service website. So you have to provide us a way to code this entire process. Luckily Chrome have a recorder fur Puppeteer (the library we use to scrape the page). Please study the following link ([Puppeteer Recorder with Chrome DevTools (testingbot.com)](https://testingbot.com/support/puppeteer/recorder.html#)) and create a `.js`with the recording.

Its important that you provide us a recording with `@puppeteer/replay`

Ensure you only click the parts that are needed to get a download of the desired document. 
<details>
  <summary>Example</summary>
  
 
```js
import url from 'url';
import { createRunner } from '@puppeteer/replay';

export async function run(extension) {
    const runner = await createRunner(extension);

    await runner.runBeforeAllSteps();

    await runner.runStep({
        type: 'setViewport',
        width: 1134,
        height: 1284,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        isLandscape: false
    });

    await runner.runStep({
        type: 'navigate',
        url: 'https://www.vodafone.de/',
        assertedEvents: [
            {
                type: 'navigation',
                url: 'https://www.vodafone.de/',
                title: ''
            }
        ]
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'aria/MeinVodafone',
                'aria/[role="generic"]'
            ],
            [
                'li.item-myvf span.icon'
            ],
            [
                'xpath///*[@id="top"]/div/header/nav/div/div[2]/div/div/ul[2]/li[2]/a/span[1]'
            ],
            [
                'pierce/li.item-myvf span.icon'
            ]
        ],
        offsetY: 16,
        offsetX: 6.5,
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'aria/Login[role="button"]'
            ],
            [
                '#meinVodafoneOverlay button'
            ],
            [
                'xpath///*[@id="mdd-login-form"]/fieldset/button'
            ],
            [
                'pierce/#meinVodafoneOverlay button'
            ]
        ],
        offsetY: 10,
        offsetX: 27.90625,
        assertedEvents: [
            {
                type: 'navigation',
                url: 'https://www.vodafone.de/meinvodafone/services/',
                title: ''
            }
        ]
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'li:nth-of-type(1) svg.icon-arrow-down-i-xsml'
            ],
            [
                'xpath///*[@id="dashboard:mobile"]/svg[1]'
            ],
            [
                'pierce/li:nth-of-type(1) svg.icon-arrow-down-i-xsml'
            ]
        ],
        offsetY: 7.015625,
        offsetX: 9.5,
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'li:nth-of-type(1) div.tiles > a:nth-of-type(1) svg'
            ],
            [
                'xpath///*[@id="content"]/div[2]/div/div/section/div/div/div/div[3]/div[2]/ul/li[1]/div/div/div[1]/a[1]/div/div[1]/svg'
            ],
            [
                'pierce/li:nth-of-type(1) div.tiles > a:nth-of-type(1) svg'
            ]
        ],
        offsetY: 63.609375,
        offsetX: 22.484375,
        assertedEvents: [
            {
                type: 'navigation',
                url: 'https://www.vodafone.de/meinvodafone/services/ihre-rechnungen/rechnungen',
                title: ''
            }
        ]
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'aria/Mehr anzeigen[role="button"]'
            ],
            [
                '#content button'
            ],
            [
                'xpath///*[@id="billoverviewWrapperId"]/bill-overview-history/bill-history/div/div[2]/div/div/div/div[2]/vf-table-brix/div[2]/div/button'
            ],
            [
                'pierce/#content button'
            ],
            [
                'text/Mehr anzeigen'
            ]
        ],
        offsetY: 10,
        offsetX: 44.375,
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'tr:nth-of-type(1) > td:nth-of-type(4) span:nth-of-type(2) > svg'
            ],
            [
                'xpath///*[@id="billoverviewWrapperId"]/bill-overview-history/bill-history/div/div[2]/div/div/div/div[2]/vf-table-brix/div[2]/table/tbody/tr[1]/td[4]/div/span[2]/svg'
            ],
            [
                'pierce/tr:nth-of-type(1) > td:nth-of-type(4) span:nth-of-type(2) > svg'
            ]
        ],
        offsetY: 13.5,
        offsetX: 22.34375,
    });
    await runner.runStep({
        type: 'click',
        target: 'main',
        selectors: [
            [
                'tr:nth-of-type(1) > td:nth-of-type(5) span:nth-of-type(2) use'
            ],
            [
                'xpath///*[@id="billoverviewWrapperId"]/bill-overview-history/bill-history/div/div[2]/div/div/div/div[2]/vf-table-brix/div[2]/table/tbody/tr[1]/td[5]/div/span[2]/svg/use'
            ],
            [
                'pierce/tr:nth-of-type(1) > td:nth-of-type(5) span:nth-of-type(2) use'
            ]
        ],
        offsetY: 10.5,
        offsetX: 13.45843505859375,
    });

    await runner.runAfterAllSteps();
}

if (process && import.meta.url === url.pathToFileURL(process.argv[1]).href) {
    run()
}

```
</details>

> :warning: **Watch our for credentials**: 
> Only provide us credentials if you really want. We are not liable for leaked credentials

> :memo: In some cases it would be beneficial to have credentials to test the scraping without your collaboration. If you don't want to provide us credentials (which is totally fine :white_check_mark:) we need your help to get the scrape for this website up and running.


## Screenshots
Provide us some screenshots how the actually site looks like. This will help us to understand the way the site works.

## HTML-Files (optional, but would be a big help)
If you don't provide us credentials, it could help if you provide us the saved HTML files. Every browser supports saving the current document.

> :memo: You can save the HTML files right after the login procedure
