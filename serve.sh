#! /usr/bin/env bash
#
# serve.sh dev|test|prod
#
# serve npl web server
#

set -x

usage() {
  echo "usage error"
  echo
  echo "usage: $0 dev|test|prod"
  exit 1
}

if [[ $# -eq 0 ]] || [[ $# -gt 1 ]]; then
  usage
fi

if [[ $1 != "test" ]] && [[ $1 != "dev" ]] && [[ $1 != "prod" ]]; then
  usage
fi

ENV_TYPE=$1
DATE=$(date +"%Y-%m-%d-%H-%M")

case $ENV_TYPE in
  dev)
    ROOT_DIR=www
    PORT=8900
    ;;
  test)
    ROOT_DIR=test
    PORT=8099
    ;;
  prod)
    ROOT_DIR=rls
    PORT=8088
    ;;
esac

LOG_DIR=log
mkdir -p $LOG_DIR

ulimit -c unlimited
npl -D bootstrapper="script/apps/WebServer/WebServer.lua"  root="$ROOT_DIR/" port="$PORT" logfile="$LOG_DIR/${ENV_TYPE}-${DATE}.log"


