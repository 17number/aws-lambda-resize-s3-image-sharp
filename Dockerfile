FROM lambci/lambda:build-nodejs10.x
ENV LANG C.UTF-8
ENV AWS_DEFAULT_REGION ap-northeast-1

ADD . .

CMD npm install && zip -r9 deploy_package.zip .
