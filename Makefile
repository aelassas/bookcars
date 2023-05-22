.ONESHELL:
deploy:
	scp .env root@Run.mg0.pl:~/bookcar
	scp docker-compose.yml root@Run.mg0.pl:~/bookcar
