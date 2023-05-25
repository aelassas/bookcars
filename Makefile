.ONESHELL:
deploy:
	scp .env root@do.mg0.pl:~/bookcar
	scp docker-compose.yml root@do.mg0.pl:~/bookcar
