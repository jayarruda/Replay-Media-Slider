# Jellyfin Media Slider


### Orijinal eklenti sahibi BobHasNoSoul'a çalışmaları için teşekkür ederim.

Jellyfin için özelleştirilebilir medya slider bileşeni. Orijinal [jellyfin-featured](https://github.com/BobHasNoSoul/jellyfin-featured) eklentisinden fork edilerek geliştirilmiştir.

![Preview 1](https://github.com/user-attachments/assets/30393add-cdad-440f-bcb9-78323e042a4c)


![Preview 2](https://github.com/user-attachments/assets/9f51aa2c-d70a-43ab-8f10-4d4a1bbf967b)


![Preview 3](https://github.com/user-attachments/assets/be7557de-8953-4569-80a5-390071da07aa)



## Özellikler

- Kullanıcı dostu medya slider arayüzü
- Her kullanıcı için ayrı liste oluşturma
- Liste kullanılmadığında api özelleştirme
- Otomatik liste güncelleme özelliği
- Liste türü desteği:
  - Rastgele seçim
- Kullanıcı bazlı özelleştirme

## Kurulum

### Linux için

``` git clone https://github.com/G-grbz/Jellyfin-Media-Slider.git ```

``` cd Jellyfin-Media-Slider ```

Slider klasörünü oluşturun:

``` sudo mkdir /usr/share/jellyfin/web/slider ```

Dosyaları klasöre taşıyın:

``` sudo cp -r * /usr/share/jellyfin/web/slider/ ```

list klasörüne okuma yazma izni verin

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list ```

Kurulum scriptini çalıştırın:

``` sudo chmod +x install.sh ```

``` sudo ./install.sh ```

Tarayıcı çerezlerini temizleyin.

### Liste Güncelleme Scripti

listUpdate klasöründeki script belirli aralıklarla kullanıcı listelerini günceller.

### Gerekli Ayarlar
.env dosyasını düzenleyerek gerekli bilgileri girin.

### Script Seçenekleri
'updateList'	Rastgele içerikleri listeler ( değerleri değiştirmek için listConfig.json el ile yapılandırılmalı ve script yeniden başlatılmalı.)

### Script Çalıştırma

Gerekli bağımlılıkları yükleyin:

``` cd /usr/share/jellyfin/web/slider/listUpdate ```

``` npm install dotenv node-fetch ```

### scripti çalıştırın:

``` node updateList.mjs ```

### Yüklemeyi Kaldırma

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh ```
``` sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ```

### Katkıda Bulunanlar
### Orijinal eklenti yazarı: BobHasNoSoul


# Jellyfin Media Slider

A customizable media slider component for Jellyfin. This project is a fork and enhancement of the original jellyfin-featured plugin. Special thanks to the original creator, BobHasNoSoul, for his work.



## Features

- User-friendly media slider interface

- Individual lists for each user

- API customization when a list is not in use

- Automatic list update functionality

- List type support:

    - Random selection (for customized content)

- User-based personalization

# Installation

# For Linux

``` git clone https://github.com/G-grbz/Jellyfin-Media-Slider.git ```

``` cd Jellyfin-Media-Slider ```

Create the slider directory:

``` sudo mkdir /usr/share/jellyfin/web/slider ```

Copy all files to the slider directory:

``` sudo cp -r * /usr/share/jellyfin/web/slider/ ```

Give read-write permission to the list folder

``` sudo chmod -R a+rw /usr/share/jellyfin/web/slider/list ```

Run the installation script:

``` sudo chmod +x install.sh ```
``` sudo ./install.sh ```

Clear browser cookies to ensure the changes take effect.

# List Update Script

The script in the listUpdate folder updates user lists at specific intervals.

# Required Settings

Edit the .env file and insert the necessary information.

# Script Options

updateList random content. (To change the values, manually configure the listConfig.json file and restart the script.)

# Running the Script

Install dependencies:

``` cd /usr/share/jellyfin/web/slider/listUpdate ```
``` npm install dotenv node-fetch ```

Run the script:

``` node updateList.mjs ```

Uninstallation

To remove the installation, run:

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh ```
``` sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ```

Contributors

Original Plugin Author: BobHasNoSoul
