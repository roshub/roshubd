# Developing roshubd

## Install dev tools

 * ROS Melodic
 * nodejs
 * yarn

```
sudo apt install python-bloom
snap install snapcraft
```

## Snap Packaging

### Install Snapcraft Dependencies

```
sudo apt install snapd
sudo snap install snapcraft
sudo snap install core16
sudo snap install core18
```

### Build snap from source

```
git submodule update --init
yarn
cd packages/roshubd
yarn build
```

### Installing snap from source build

```
sudo snap install ./roshubd_X.Y_amd64.snap --dangerous --classic

sudo snap connect roshubd:bluetooth-control :bluetooth-control
sudo snap connect roshubd:bluez :bluez
sudo snap connect roshubd:network-observe :network-observe
sudo snap connect roshubd:network-manager :network-manager
sudo snap connect roshubd:raw-usb :raw-usb
sudo snap connect roshubd:network-observe :network-observe

sudo snap restart roshubd
```

### Publish snap to store

```
snapcraft login
snapcraft push ./roshubd_0.6.0_amd64.snap
```


## Debian packaging


```
yarn run clean-catkin
yarn run build-catkin
```

- To run the debian packaging script for roshubd, run `yarn run build-catkin` in the roshubd folder.
- Before running sequential builds, run `yarn run clean-catkin` first.

## Live Developing

 * Install bleSerialServer

```
sudo snap install roshub-ble-serial-server

```

 * Ensure your user has permission to control the wifi adapter

```
sudo usermod -G netdev -a <YOUR-USER>
```

 * Ensure your user has needed `sudo` permissions

```
%sudo   ALL=(ALL:ALL) NOPASSWD: /snap/bin/roshub-ble-serial-server.ble-serial-server
%sudo   ALL=(ALL:ALL) NOPASSWD: /usr/bin/apt-get
%sudo   ALL=(ALL:ALL) NOPASSWD: /usr/bin/snap
%sudo   ALL=(ALL:ALL) NOPASSWD: /usr/bin/nmcli
%sudo   ALL=(ALL:ALL) NOPASSWD: /home/<YOUR-USER>/.bin/blink1-tool
```

 * Install blink1 LED library

```
sudo apt install libusb-1.0-0-dev
git clone https://github.com/todbot/blink1-tool.git
cd blink1-tool
make
mkdir -p ~/.bin
cp ./blink1-tool ~/.bin
cd -
```

 * Watch roshubd

```
cd packages/roshubd
yarn watch
```
