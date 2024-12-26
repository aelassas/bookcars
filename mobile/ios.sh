# 1. install xcode(ios) and xcode command line tools

# 2. install brew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 3. install nvm, node and npm
brew update
brew install nvm
mkdir ~/.nvm
echo 'export NVM_DIR=~/.nvm' >> ~/.bash_profile
echo 'source $(brew --prefix nvm)/nvm.sh' >> ~/.bash_profile
echo 'source ~/.bash_profile' >> ~/.zshrc
source ~/.zshrc
nvm -v
nvm install 22
node -v
npm -v

# 4. install watchman
brew install watchman

# 5. install ruby@3.1 and cocoapods
brew install ruby@3.1
echo 'export PATH="/usr/local/opt/ruby@3.1/bin:$PATH"' >> ~/.zshrc # on mac intel: /usr/local/opt, on mac M1, M2, M3: /opt/homebrew/opt
source ~/.zshrc
sudo gem install cocoapods
echo 'export PATH="/usr/local/lib/ruby/gems/3.1.0/bin:$PATH"' >> ~/.zshrc # check /usr/local/lib/ruby/gems/3.1.0/bin
source ~/.zshrc
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# 6. clone bookcars source code down to ~/dev folder
cd ~/dev
git clone https://github.com/aelassas/bookcars.git bookcars

# 7. add .env, google-services.json and GoogleService-Info.plist to mobile/ folder

# 8. prebuild ios app
cd ~/dev/bookcars/mobile/
npm install
npm run prebuild

# 9. open ios project in xcode and add certifcate
xed ios

# 10. run ios app
npm run ios
