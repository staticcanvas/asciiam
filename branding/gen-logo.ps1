# [cmdletbinding()]
# param(
#     [parameter(Mandatory,position=0)]
#     [string]$project,
#     [parameter(Mandatory,position=1)]
#     [string]$LogoName
# )
# Logo
mystro config -Source "./asciiam-logo.svg" -OutputDir "./dist" -AutoScale | mystro Gen

# Banner
mystro config -Source "./asciiam-banner.svg" -OutputDir "./dist" -AutoScale | mystro Gen

# mystro config -Source "./" -OutputDir "./dist" -AutoScale | mystro Gen
