#pragma once

struct yy_buffer_state;
using YY_BUFFER_STATE = yy_buffer_state*;

YY_BUFFER_STATE yy_scan_string(const char* text);
void yy_delete_buffer(YY_BUFFER_STATE buffer);
