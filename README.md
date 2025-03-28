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

Slider klasörünü oluşturun:

``` sudo mkdir /usr/share/jellyfin/web/slider ```

Dosyaları klasöre taşıyın:

``` sudo cp -r * /usr/share/jellyfin/web/slider/ ```

Kurulum scriptini çalıştırın:

``` cd /usr/share/jellyfin/web/slider/ ```

``` sudo chmod +x install.sh ```

``` sudo ./install.sh ```

Tarayıcı çerezlerini temizleyin.

### Liste Güncelleme Scripti

listUpdate klasöründeki script belirli aralıklarla kullanıcı listelerini günceller.

### Gerekli Ayarlar
.env dosyasını düzenleyerek gerekli bilgileri girin.

### Script Seçenekleri
'updateList-Random'	Rastgele içerikleri listeler ( değerleri değiştirmek için listConfig.json el ile yapılandırılmalı ve script yeniden başlatılmalı.)

### Script Çalıştırma

Gerekli bağımlılıkları yükleyin:

``` cd /usr/share/jellyfin/web/slider/listUpdate ```

``` npm install dotenv node-fetch ```

### scripti çalıştırın:

``` node updateList-Random.js ```

### Yüklemeyi Kaldırma

``` sudo chmod +x /usr/share/jellyfin/web/slider/uninstall.sh ```
``` sudo sh /usr/share/jellyfin/web/slider/uninstall.sh ```

### Katkıda Bulunanlar
### Orijinal eklenti yazarı: BobHasNoSoul
