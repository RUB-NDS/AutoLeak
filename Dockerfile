#FROM python:3.8.2
FROM mcr.microsoft.com/playwright/python:v1.49.1-noble
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE 1
RUN pip install --upgrade pip
RUN pip install pipenv


# install brave and xvfb
RUN apt update && apt install -y apt-transport-https curl
RUN curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
RUN echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg arch=amd64] https://brave-browser-apt-release.s3.brave.com/ stable main"|tee /etc/apt/sources.list.d/brave-browser-release.list
RUN apt update && apt install -y brave-browser xvfb
RUN apt get clean


# Tell pipenv to create venv in the current directory
ENV PIPENV_VENV_IN_PROJECT=1

RUN mkdir -p /opt/autograph
WORKDIR /opt/autograph
ADD Pipfile .


# install playwright and dependencies
RUN pipenv install
RUN pipenv install --system --deploy --ignore-pipfile
RUN pipenv run playwright install

VOLUME /opt/autograph
