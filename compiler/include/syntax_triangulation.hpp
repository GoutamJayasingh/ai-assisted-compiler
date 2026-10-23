#pragma once

#include "lexer_buffer.hpp"
#include "semantic.hpp"

#include <algorithm>
#include <cstdlib>
#include <string>
#include <utility>
#include <vector>

namespace compiler {

struct TriangulationCandidate {
    int line = 1;
    int column = 1;
    int start_line = 1;
    int end_line = 1;
    int score = 0;
    std::vector<std::string> evidence;
};

struct SyntaxTriangulation {
    // "clear", "supported", or "inconclusive".
    std::string status = "inconclusive";
    std::string summary;
    std::vector<TriangulationCandidate> candidates;
};

// Combines authoritative forward-parser diagnostics with a reverse scan of
// the token stream. This intentionally analyzes only parentheses because they
// are the structural delimiters currently supported by the custom language.
inline SyntaxTriangulation analyzeSyntaxTriangulation(
    const std::vector<TokenInfo>& tokens,
    const std::vector<Diagnostic>& diagnostics
) {
    struct WorkingCandidate {
        std::size_t first = 0;
        std::size_t last = 0;
        TriangulationCandidate value;
        bool has_forward = false;
        bool has_structural = false;
    };

    SyntaxTriangulation result;
    std::vector<WorkingCandidate> working;
    bool has_syntax_diagnostic = false;

    auto regionFor = [&tokens](std::size_t index) {
        if (tokens.empty()) {
            return std::pair<std::size_t, std::size_t>{0, 0};
        }
        index = std::min(index, tokens.size() - 1);
        std::size_t first = index;
        while (first > 0 && tokens[first - 1].type != "SEMICOLON") {
            --first;
        }
        std::size_t last = index;
        while (last + 1 < tokens.size() &&
               tokens[last].type != "SEMICOLON") {
            ++last;
        }
        return std::pair<std::size_t, std::size_t>{first, last};
    };

    auto nearestToken = [&tokens](int line, int column) {
        std::size_t best = 0;
        long best_distance = -1;
        for (std::size_t i = 0; i < tokens.size(); ++i) {
            const long distance =
                std::labs(static_cast<long>(tokens[i].line - line)) * 1000L +
                std::labs(static_cast<long>(tokens[i].column - column));
            if (best_distance < 0 || distance < best_distance) {
                best = i;
                best_distance = distance;
            }
        }
        return best;
    };

    auto addEvidence = [&](std::size_t token_index, int line, int column,
                           int weight, const std::string& evidence,
                           bool forward, bool structural) {
        const auto region = regionFor(token_index);
        auto found = std::find_if(
            working.begin(), working.end(),
            [&](const WorkingCandidate& item) {
                return item.first == region.first && item.last == region.second;
            });

        if (found == working.end()) {
            WorkingCandidate item;
            item.first = region.first;
            item.last = region.second;
            item.value.line = line;
            item.value.column = column;
            if (!tokens.empty()) {
                item.value.start_line = tokens[region.first].line;
                item.value.end_line = tokens[region.second].line;
            } else {
                item.value.start_line = line;
                item.value.end_line = line;
            }
            working.push_back(std::move(item));
            found = working.end() - 1;
        }

        found->value.score += weight;
        found->value.evidence.push_back(evidence);
        found->has_forward = found->has_forward || forward;
        found->has_structural = found->has_structural || structural;
    };

    // Forward evidence comes from the existing parser and remains authoritative.
    for (const auto& diagnostic : diagnostics) {
        if (diagnostic.phase != "syntax") {
            continue;
        }
        has_syntax_diagnostic = true;
        const std::size_t index = tokens.empty()
            ? 0
            : nearestToken(diagnostic.line, diagnostic.column);
        addEvidence(
            index, diagnostic.line, diagnostic.column, 2,
            "Forward parser: " + diagnostic.message, true, false
        );
    }

    // Reverse structural scan: closing parentheses encountered from the end
    // are paired with opening parentheses. Unpaired tokens are evidence, not
    // proof of the exact intended correction.
    std::vector<std::size_t> unmatched_closers;
    std::vector<std::size_t> unmatched_openers;
    for (std::size_t i = tokens.size(); i > 0; --i) {
        const std::size_t index = i - 1;
        if (tokens[index].type == "RPAREN") {
            unmatched_closers.push_back(index);
        } else if (tokens[index].type == "LPAREN") {
            if (!unmatched_closers.empty()) {
                unmatched_closers.pop_back();
            } else {
                unmatched_openers.push_back(index);
            }
        }
    }

    for (const auto index : unmatched_openers) {
        addEvidence(
            index, tokens[index].line, tokens[index].column, 2,
            "Backward scan: unmatched opening parenthesis", false, true
        );
    }
    for (const auto index : unmatched_closers) {
        addEvidence(
            index, tokens[index].line, tokens[index].column, 2,
            "Backward scan: unmatched closing parenthesis", false, true
        );
    }

    std::sort(
        working.begin(), working.end(),
        [](const WorkingCandidate& left, const WorkingCandidate& right) {
            if (left.value.score != right.value.score) {
                return left.value.score > right.value.score;
            }
            if (left.value.line != right.value.line) {
                return left.value.line < right.value.line;
            }
            return left.value.column < right.value.column;
        }
    );

    bool converged = false;
    for (auto& item : working) {
        converged = converged || (item.has_forward && item.has_structural);
        result.candidates.push_back(std::move(item.value));
    }

    if (!has_syntax_diagnostic && unmatched_openers.empty() &&
        unmatched_closers.empty()) {
        result.status = "clear";
        result.summary =
            "No syntax diagnostics or unmatched parenthesis evidence found.";
    } else if (converged) {
        result.status = "supported";
        result.summary =
            "Forward parser and backward structural evidence support a candidate region; ranking is heuristic.";
    } else {
        result.status = "inconclusive";
        result.summary =
            "Evidence did not converge on a structural fault region. Review the ranked candidates; no exact fix is implied.";
    }

    return result;
}

} // namespace compiler
