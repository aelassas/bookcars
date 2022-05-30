# BookCars.ma

Book Cars Rental Service

# api/.env

```
NODE_ENV = development
BC_PORT = 4000
BC_HTTPS = false
BC_PRIVATE_KEY = /etc/ssl/www.bookcars.ma.key
BC_CERTIFICATE = /etc/ssl/www.bookcars.ma.crt
BC_APP_HOST = localhost:3000
BC_DB_HOST = localhost
BC_DB_PORT = 27017
BC_DB_SSL = false
BC_DB_SSL_KEY = /home/bookcars/ssl/www.bookcars.ma.key
BC_DB_SSL_CERT = /home/bookcars/ssl/www.bookcars.ma.crt
BC_DB_SSL_CA = /home/bookcars/ssl/www.bookcars.ma.ca.pem
BC_DB_DEBUG = true
BC_DB_APP_NAME = bookcars
BC_DB_AUTH_SOURCE = admin
BC_DB_USERNAME = admin
BC_DB_PASSWORD = PASSWORD
BC_DB_NAME = bookcars
BC_JWT_SECRET = SECRET
BC_JWT_EXPIRE_AT = 86400
BC_TOKEN_EXPIRE_AT = 86400
BC_SMTP_HOST = in-v3.mailjet.com
BC_SMTP_PORT = 587
BC_SMTP_USER = USER
BC_SMTP_PASS = PASSWORD
BC_SMTP_FROM = bookcars.ma@gmail.com
BC_ADMIN_EMAIL = bookcars.ma@gmail.com
BC_DEFAULT_LANGUAGE = fr
BC_CDN_USERS = /var/www/bookcars.ma/cdn/users
BC_CDN_TEMP_USERS = /var/www/bookcars.ma/cdn/temp/users
BC_CDN_CARS = /var/www/bookcars.ma/cdn/cars
BC_CDN_TEMP_CARS = /var/www/bookcars.ma/cdn/temp/cars
BC_BACKEND_HOST = http://localhost:3000/
BC_FRONTEND_HOST = http://localhost:3001/
BC_MINIMUM_AGE = 21
```

## backend/.env

```
PORT = 3000
REACT_APP_NODE_ENV = development
REACT_APP_BC_API_HOST = http://localhost:4000
REACT_APP_BC_RECAPTCHA_SITE_KEY = GOOGLE_RECAPTCHA_SITE_KEY 
REACT_APP_BC_DEFAULT_LANGUAGE = fr
REACT_APP_BC_DATE_FORMAT = llll
REACT_APP_BC_PAGE_SIZE = 30
REACT_APP_BC_CARS_PAGE_SIZE = 15
REACT_APP_BC_BOOKINGS_PAGE_SIZE = 20
REACT_APP_BC_CDN_USERS = http://localhost/cdn/users
REACT_APP_BC_CDN_TEMP_USERS = http://localhost/cdn/temp/users
REACT_APP_BC_CDN_CARS = http://localhost/cdn/cars
REACT_APP_BC_CDN_TEMP_CARS = http://localhost/cdn/temp/cars
REACT_APP_BC_COMAPANY_IMAGE_WIDTH = 60
REACT_APP_BC_COMAPANY_IMAGE_HEIGHT = 30
REACT_APP_BC_CAR_IMAGE_WIDTH = 300
REACT_APP_BC_CAR_IMAGE_HEIGHT = 200
REACT_APP_BC_APP_TYPE = backend
REACT_APP_BC_MINIMUM_AGE = 21
```

## frontend/.env

```
PORT = 3001
REACT_APP_NODE_ENV = development
REACT_APP_BC_API_HOST = http://localhost:4000
REACT_APP_BC_RECAPTCHA_SITE_KEY = GOOGLE_RECAPTCHA_SITE_KEY
REACT_APP_BC_DEFAULT_LANGUAGE = fr
REACT_APP_BC_DATE_FORMAT = llll
REACT_APP_BC_PAGE_SIZE = 30
REACT_APP_BC_CARS_PAGE_SIZE = 15
REACT_APP_BC_BOOKINGS_PAGE_SIZE = 20
REACT_APP_BC_CDN_USERS = http://localhost/cdn/users
REACT_APP_BC_CDN_CARS = http://localhost/cdn/cars
REACT_APP_BC_COMAPANY_IMAGE_WIDTH = 60
REACT_APP_BC_COMAPANY_IMAGE_HEIGHT = 30
REACT_APP_BC_CAR_IMAGE_WIDTH = 300
REACT_APP_BC_CAR_IMAGE_HEIGHT = 200
REACT_APP_BC_APP_TYPE = frontend
REACT_APP_BC_MINIMUM_AGE = 21
```
