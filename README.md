<img src=./icons/roshub_vector_logo.svg width=150>

Device agent for [The Robotics Cloud](https://roshub.io).

# roshubd

[![Snap Status](https://build.snapcraft.io/badge/roshub/roshubd.svg)](https://build.snapcraft.io/user/roshub/roshubd)

## Introduction

Join the [Beta Program](https://beta.roshub.io) for more information.

## Install Snap

 * Install snap package

```
sudo snap install roshubd --edge --devmode
```

 * Setup snap permissions

```
sudo snap connect roshubd:bluetooth-control :bluetooth-control
sudo snap connect roshubd:bluez :bluez
sudo snap connect roshubd:network-observe :network-observe
sudo snap connect roshubd:network-manager :network-manager
sudo snap connect roshubd:raw-usb :raw-usb
sudo snap connect roshubd:network-observe :network-observe
sudo snap connect roshubd:snapd-control :snapd-control
```

 * Reset service to load new permissions

```
sudo snap restart roshubd
```

## Logging

View logs using

```
sudo snap logs -f roshubd
```

## Configuration


 * `/var/snap/roshubd/common/config.json` - Snap configuration location
 * `$HOME/.roshubd/config.json` - Development configuration location

