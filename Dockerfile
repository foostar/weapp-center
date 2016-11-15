FROM node:6.2.2

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install --production --registry=https://registry.npm.taobao.org
COPY . /usr/src/app

# set timezone
RUN rm /etc/localtime && \
    ln -s /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

CMD [ "npm", "start" ]

EXPOSE 3000
