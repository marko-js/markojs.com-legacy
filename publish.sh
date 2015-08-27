TARGET_DIR="../marko-js.github.io"
TARGET_DIR=`(cd $TARGET_DIR; pwd)`

git add . --all
git commit -a -m "Updated blog"
git push origin master

# Rebuild the site
NODE_ENV=production npm run build

rm -rf $TARGET_DIR/*
cp -r build/ $TARGET_DIR/

cd $TARGET_DIR
git add . --all
git commit -a -m "Updated website"
git push origin master