cmake_minimum_required(VERSION 2.8.3)
project(roshubd)

## Compile as C++11, supported in ROS Kinetic and newer
# add_compile_options(-std=c++11)

## Find catkin macros and libraries
find_package(catkin REQUIRED COMPONENTS
)

catkin_package(
#  INCLUDE_DIRS include
#  LIBRARIES vapor_master
#  CATKIN_DEPENDS std_msgs
#  DEPENDS nodejs
)

################################################
## Declare ROS messages, services and actions ##
################################################

## Generate messages in the 'msg' folder
# add_message_files(
#   FILES
#   Message1.msg
#   Message2.msg
# )

#catkin_package(
#  INCLUDE_DIRS include
#  LIBRARIES roshub_manager
#  CATKIN_DEPENDS actionlib actionlib_msgs message_generation roscpp std_msgs
#  DEPENDS system_lib
#)

###########
## Build ##
###########

include_directories(
# include
  ${catkin_INCLUDE_DIRS}
)

# build node packages
execute_process(
  COMMAND yarn --cwd ${CMAKE_CURRENT_SOURCE_DIR}
)
execute_process(
  COMMAND yarn --cwd ${CMAKE_CURRENT_SOURCE_DIR} run prepare-catkin
)

# install node packages & other scripts
install(
  PROGRAMS bin/roshubd
  DESTINATION ${CATKIN_GLOBAL_BIN_DESTINATION}
)

install(PROGRAMS package.json
        DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}
)

install(DIRECTORY dist/
  DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}/dist
)

install(DIRECTORY src/
  DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}/src
)


install(DIRECTORY node_modules
        DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}
)
