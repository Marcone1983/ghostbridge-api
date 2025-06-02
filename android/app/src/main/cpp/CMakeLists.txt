cmake_minimum_required(VERSION 3.4.1)

# Set C++ standard for advanced security features
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add library
add_library(
    secureMemoryWiper
    SHARED
    SecureMemoryWiper.cpp
)

# Find required libraries
find_library(log-lib log)

# Link libraries with Android-specific libs
target_link_libraries(
    secureMemoryWiper
    android
    ${log-lib}
)