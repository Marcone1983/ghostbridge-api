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

# CONSTANT-TIME POST-QUANTUM CRYPTOGRAPHY LIBRARY
add_library(
    constanttimecrypto
    SHARED
    ConstantTimeCrypto.cpp
)

# Find required libraries
find_library(log-lib log)

# Compiler flags for constant-time operations
target_compile_options(constanttimecrypto PRIVATE
    -O2
    -fno-omit-frame-pointer
    -fstack-protector-strong
    -D_FORTIFY_SOURCE=2
    -Wno-unused-parameter
    -DCONSTANT_TIME_CRYPTO
)

# Link libraries with Android-specific libs
target_link_libraries(
    secureMemoryWiper
    android
    ${log-lib}
)

target_link_libraries(
    constanttimecrypto
    android
    ${log-lib}
)

# ADVANCED SIDE-CHANNEL PROTECTION LIBRARY
add_library(
    sidechannelprotection
    SHARED
    AdvancedSideChannelProtection.cpp
)

# Compiler flags for maximum side-channel resistance
target_compile_options(sidechannelprotection PRIVATE
    -O2
    -fno-omit-frame-pointer
    -fstack-protector-strong
    -D_FORTIFY_SOURCE=2
    -Wno-unused-parameter
    -DADVANCED_SIDECHANNEL_PROTECTION
    -DPOWER_ANALYSIS_RESISTANT
    -DEM_LEAKAGE_PROTECTION
    -DCACHE_ATTACK_MITIGATION
)

target_link_libraries(
    sidechannelprotection
    android
    ${log-lib}
)