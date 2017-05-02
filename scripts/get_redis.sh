#!/bin/bash

cwd="$(realpath "$(dirname "$0")")"
project_root="$(realpath "${cwd}/..")"
cd "$cwd"

mkdir -p redis
cd redis

wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make

bin_dir="${project_root}/binaries"
mkdir -p "$bin_dir"
cp src/redis-server "${bin_dir}/redis-server"

echo "\"redis-server\" binary in ${bin_dir}"
