# Autoleak

> Find XS-Leaks in the browser by diffing DOM-Graphs in two states

## Paper
The contents of this repository has been published as a part of a CCS'23 paper. If you use Autoleak for academic research, we encourage you to cite the following [paper](https://doi.org/10.1145/3576915.3616598):

```
@inproceedings{autoleakCCS2023,
  title={Finding All Cross-Site Needles in the DOM Stack: A Comprehensive Methodology for the Automatic XS-Leak Detection in Web Browsers},
  author={No{\ss}, Dominik Trevor and Knittel, Lukas and Mainka, Christian and Niemietz, Marcus and Schwenk, J{\"o}rg},
  booktitle={Proceedings of the 2023 ACM SIGSAC Conference on Computer and Communications Security},
  pages={2456--2470},
  year={2023}
}
```

## Docker Compose Setup
1. Change environment variables in `.env` file (see below for details)
2. Run the complete setup like this:
```
docker compose up  -d
# add --build to rebuild the images
```
- or with letsencrypt:
```
docker compose \
    -f docker-compose.yml \
    -f docker-compose.letsencrypt.yml \
    up --build -d
```
3. Open `https://127.0.0.1` or basedomain if your are using your domain



## Environment Variables
```
FRONTEND_USERNAM=admin               # username for basic auth
FRONTEND_PASSWORD=password           # password for basic auth
DEMO_MODE=0                          # enable/disable readonly mode
BASEDOMAIN=example.com               # basedomain for the frontend
CROSSORIGINDOMAIN=test.com           # domain for the cross origin iframe
TEST_CONFIG=testconfigs/config.json  # path to the test config (see /testconfigs)
```


## Add new Tests
Adding new test paramaters is easy. You can change inclusion methods, differences, browsers, just by editing the [config.json](./testconfigs/config.json)

## Test Config

Example config that shows some options:


```json
{
  "browsers": [
    "chrome",
    "firefox",
    "webkit",
    "brave"
  ],
  "differences": [
    {
      "name": "XFrameOptionsDENY",
      "response0": {
        "status": 200,
        "headers": [
          {
            "name": "X-Frame-Options",
            "value": "DENY"
          }
        ]
      },
      "response1": {
        "status": 200,
        "headers": []
      }
    },
    {
      "name": "StatusCode500vs200",
      "response0": {
        "status": 500,
        "headers": []
      },
      "response1": {
        "status": 200,
        "headers": []
      }
    },
    {
      "name": "ForceFileTypeCSS",
      "response0": {
        "status": 200,
        "headers": [],
        "filetype": {
          "name": "css",
          "contenttype": "text/css",
          "filetemplate": "test.css"
        }
      },
      "response1": {
        "status": 200,
        "headers": []
      }
    },
    {
      "name": "HTMLwithIframe",
      "response0": {
        "status": 200,
        "headers": [],
        "filetype": {
          "name": "iframeHTML",
          "contenttype": "text/html",
          "filetemplate": "iframe.html"
        }
      },
      "response1": {
        "status": 200,
        "headers": []
      }
    }
  ],
  "inclusionmethods": [
    {
      "name": "iframe",
      "template": "iframe.html"
    },
    {
      "name": "iframeSandbox",
      "template": "iframesandbox.html"
    },
    {
      "name": "object",
      "template": "object.html"
    },
    {
      "name": "image",
      "template": "image.html"
    },
    {
      "name": "stylesheet",
      "template": "stylesheet.html"
    }
  ],
  "filetypes": [
    {
      "name": "html",
      "contenttype": "text/html",
      "filetemplate": "test.html"
    },
    {
      "name": "css",
      "contenttype": "text/css",
      "filetemplate": "test.css"
    },
    {
      "name": "text",
      "contenttype": "text/plain",
      "filetemplate": "test.txt"
    }
  ]
}
```

