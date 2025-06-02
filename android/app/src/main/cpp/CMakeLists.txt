cmake_minimum_required(VERSION 3.4.1)

# Set C++ standard
set(CMAKE_CXX_STANDARD 14)

# Add library
add_library(
    secureMemoryWiper
    SHARED
    SecureMemoryWiper.cpp
)

# Find required libraries
find_library(log-lib log)

# Link libraries
target_link_libraries(
    secureMemoryWiper
    ${log-lib}
)