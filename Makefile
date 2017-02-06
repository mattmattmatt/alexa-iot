deploy: zip upload clean

test:
	npm test

test-w:
	npm run test-w

zip:
	zip -r -9 _upload.zip * -x '*.psd' -x '.git'

upload:
	aws lambda update-function-code --function taskerTest --zip-file fileb://_upload.zip

clean:
	rm ./_upload.zip
